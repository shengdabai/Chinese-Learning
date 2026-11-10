"""Offline regression checks: python -m unittest discover -s tests -v."""
import json
import os
import unittest
import uuid
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import httpx

# Tests must never load local credentials or contact MongoDB/OpenAI.
with patch('dotenv.load_dotenv'):
    from backend import server

SESSION_ID = str(uuid.uuid4())
SESSION = {
    'session_id': SESSION_ID, 'topic': 'Travel', 'native_language': 'English',
    'vocabulary': [], 'dialogue_history': [],
}
AI_REPLY = {
    'response': '你好', 'translation': 'Hello', 'pinyin': 'ni hao',
    'suggestions': ['Keep practicing'], 'errors_detected': ['Word order'],
}


def completion(data):
    return SimpleNamespace(choices=[SimpleNamespace(
        message=SimpleNamespace(content=json.dumps(data)))])


class BackendTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.enterContext(patch.object(server, 'DATABASE_AVAILABLE', False))
        self.enterContext(patch.object(server, 'SESSIONS_CACHE', {}))
        self.db = Mock(insert_one=AsyncMock(), find_one=AsyncMock(return_value=None),
                       update_one=AsyncMock())
        self.enterContext(patch.object(server, 'sessions_collection', self.db))
        self.ai = AsyncMock(return_value=completion(AI_REPLY))
        self.enterContext(patch.object(server, 'openai_client', SimpleNamespace(
            chat=SimpleNamespace(completions=SimpleNamespace(create=self.ai)))))
        self.http = httpx.AsyncClient(transport=httpx.ASGITransport(app=server.app),
                                     base_url='http://test')
        self.addAsyncCleanup(self.http.aclose)

    async def session_requests(self):
        return [
            await self.http.post('/api/start-dialogue', json={
                'session_id': SESSION_ID, 'message': '你好', 'is_user': True}),
            await self.http.post('/api/get-dialogue-translation', params={'session_id': SESSION_ID}),
            await self.http.post('/api/end-session', params={'session_id': SESSION_ID}),
            await self.http.get(f'/api/session/{SESSION_ID}'),
        ]

    async def test_missing_sessions_remain_404(self):
        for response in await self.session_requests():
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.json()['detail'], 'Session not found')
        self.ai.assert_not_called()

    async def test_internal_exception_details_are_not_sent_to_clients(self):
        with patch.object(server, 'get_session_data', AsyncMock(side_effect=RuntimeError('private-provider-detail'))):
            for response in await self.session_requests():
                self.assertEqual(response.status_code, 500)
                self.assertNotIn('private-provider-detail', response.text)
        self.ai.side_effect = RuntimeError('private-provider-detail')
        response = await self.http.post('/api/generate-vocabulary', json={
            'topic': 'Travel', 'native_language': 'English'})
        self.assertEqual(response.status_code, 500)
        self.assertNotIn('private-provider-detail', response.text)

    async def test_topic_and_language_validation_before_provider_call(self):
        for topic, language in [('   ', 'English'), ('ab', 'English'),
                                ('a' * 201, 'English'), ('Travel', 'invented')]:
            response = await self.http.post('/api/generate-vocabulary', json={
                'topic': topic, 'native_language': language})
            self.assertEqual(response.status_code, 422)
        self.ai.assert_not_called()

    async def test_session_id_and_message_validation(self):
        for session_id, message in [('invalid', '你好'), (SESSION_ID, '  '),
                                    (SESSION_ID, 'a' * 2001)]:
            response = await self.http.post('/api/start-dialogue', json={
                'session_id': session_id, 'message': message, 'is_user': True})
            self.assertEqual(response.status_code, 422)
        for route in ['get-dialogue-translation', 'end-session']:
            response = await self.http.post('/api/' + route, params={'session_id': 'invalid'})
            self.assertEqual(response.status_code, 422)
        response = await self.http.get('/api/session/invalid')
        self.assertEqual(response.status_code, 422)
        self.ai.assert_not_called()
        self.db.find_one.assert_not_called()

    async def test_failed_insert_remains_readable_and_updatable(self):
        server.DATABASE_AVAILABLE = True
        self.db.insert_one.side_effect = RuntimeError('database unavailable')
        original = deepcopy(SESSION)
        self.assertFalse(await server.save_session_data(original))
        original['topic'] = 'changed outside storage'
        retrieved = await server.get_session_data(SESSION_ID)
        self.assertEqual(retrieved['topic'], 'Travel')
        retrieved['dialogue_history'].append({'message': 'uncommitted'})
        self.assertEqual((await server.get_session_data(SESSION_ID))['dialogue_history'], [])
        self.assertFalse(await server.update_session_data(SESSION_ID, {'status': 'completed'}))
        self.assertEqual((await server.get_session_data(SESSION_ID))['status'], 'completed')
        self.db.find_one.assert_not_called()
        self.db.update_one.assert_not_called()

    async def test_failed_update_retains_loaded_session_and_new_dialogue(self):
        server.DATABASE_AVAILABLE = True
        self.db.find_one.return_value = deepcopy(SESSION)
        self.db.update_one.side_effect = RuntimeError('database unavailable')
        response = await self.http.post('/api/start-dialogue', json={
            'session_id': SESSION_ID, 'message': '你好', 'is_user': True})
        self.assertEqual(response.status_code, 200, response.text)
        cached = await server.get_session_data(SESSION_ID)
        self.assertEqual(cached['topic'], 'Travel')
        self.assertEqual(len(cached['dialogue_history']), 2)
        self.assertEqual(cached['dialogue_history'][-1]['errors_detected'], ['Word order'])

    async def test_mongo_insert_does_not_mutate_caller_document(self):
        server.DATABASE_AVAILABLE = True
        async def insert(document):
            document['_id'] = 'mongo-id'
        self.db.insert_one.side_effect = insert
        original = deepcopy(SESSION)
        self.assertTrue(await server.save_session_data(original))
        self.assertNotIn('_id', original)

    async def test_vocabulary_generation_awaits_provider_and_saves_session(self):
        item = dict(chinese='你好', pinyin='ni hao', translation='Hello',
                    example_sentence='你好', example_translation='Hello',
                    sentence_pattern='你好', pattern_explanation='Greeting')
        self.ai.return_value = completion({'vocabulary': [item]})
        response = await self.http.post('/api/generate-vocabulary', json={
            'topic': '  Travel  ', 'native_language': 'English'})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['topic'], 'Travel')
        self.ai.assert_awaited_once()
        self.assertIn(response.json()['session_id'], server.SESSIONS_CACHE)

    async def test_dialogue_persists_errors_for_report(self):
        server.SESSIONS_CACHE[SESSION_ID] = deepcopy(SESSION)
        response = await self.http.post('/api/start-dialogue', json={
            'session_id': SESSION_ID, 'message': '你好', 'is_user': True})
        self.assertEqual(response.status_code, 200, response.text)
        self.ai.assert_awaited_once()
        history = server.SESSIONS_CACHE[SESSION_ID]['dialogue_history']
        self.assertEqual(history[-1]['errors_detected'], ['Word order'])
        self.ai.return_value = completion(dict(strengths=[], areas_for_improvement=[],
                                              suggestions=[], overall_score=75))
        response = await self.http.post('/api/end-session', params={'session_id': SESSION_ID})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIn('Word order', self.ai.call_args.kwargs['messages'][1]['content'])

    async def test_invalid_ai_reply_does_not_mutate_history(self):
        server.SESSIONS_CACHE[SESSION_ID] = deepcopy(SESSION)
        self.ai.return_value = completion({'response': '你好'})
        response = await self.http.post('/api/start-dialogue', json={
            'session_id': SESSION_ID, 'message': '你好', 'is_user': True})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(server.SESSIONS_CACHE[SESSION_ID]['dialogue_history'], [])

    async def test_translation_awaits_provider(self):
        server.SESSIONS_CACHE[SESSION_ID] = deepcopy(SESSION)
        server.SESSIONS_CACHE[SESSION_ID]['dialogue_history'] = [{'message': '你好', 'is_user': True}]
        self.ai.return_value = completion({'dialogue_translations': [{'translation': 'Hello'}]})
        response = await self.http.post('/api/get-dialogue-translation', params={'session_id': SESSION_ID})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['translations'][0]['translation'], 'Hello')
        self.ai.assert_awaited_once()

    async def test_real_sdk_initializes_with_installed_httpx(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-placeholder'}), \
             patch.object(server, 'client', Mock()), \
             patch.object(server, 'check_database_permissions', AsyncMock()):
            async with server.lifespan(server.app):
                self.assertIsInstance(server.openai_client, server.AsyncOpenAI)

    async def test_lifespan_validates_configuration_and_closes_clients(self):
        with patch.dict(os.environ, {'OPENAI_API_KEY': ''}):
            with self.assertRaisesRegex(RuntimeError, 'OPENAI_API_KEY'):
                async with server.lifespan(server.app):
                    self.fail('Missing configuration must prevent startup')
        provider = Mock(close=AsyncMock())
        mongo = Mock()
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'test-placeholder'}), \
             patch.object(server, 'AsyncOpenAI', return_value=provider) as factory, \
             patch.object(server, 'client', mongo), \
             patch.object(server, 'check_database_permissions', AsyncMock()):
            async with server.lifespan(server.app):
                factory.assert_called_once_with(timeout=30, max_retries=1)
            provider.close.assert_awaited_once()
            mongo.close.assert_called_once()


if __name__ == '__main__':
    unittest.main()
