
import requests
import sys
import json
from datetime import datetime

class ChineseLearnAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test the health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        if success:
            print(f"Health check response: {response}")
        return success

    def test_get_languages(self):
        """Test getting supported languages"""
        success, response = self.run_test(
            "Get Supported Languages",
            "GET",
            "api/languages",
            200
        )
        if success:
            languages = response.get('languages', [])
            print(f"Supported languages count: {len(languages)}")
            print(f"Sample languages: {languages[:5]}...")
        return success

    def test_generate_vocabulary(self, topic="ordering food at a restaurant", native_language="English"):
        """Test vocabulary generation"""
        success, response = self.run_test(
            "Generate Vocabulary",
            "POST",
            "api/generate-vocabulary",
            200,
            data={
                "topic": topic,
                "native_language": native_language
            }
        )
        if success:
            self.session_id = response.get('session_id')
            vocabulary = response.get('vocabulary', [])
            print(f"Session ID: {self.session_id}")
            print(f"Vocabulary items count: {len(vocabulary)}")
            if vocabulary:
                sample_item = vocabulary[0]
                print(f"Sample vocabulary item:")
                print(f"  Chinese: {sample_item.get('chinese')}")
                print(f"  Pinyin: {sample_item.get('pinyin')}")
                print(f"  Translation: {sample_item.get('translation')}")
        return success

    def test_start_dialogue(self, message="你好，我想点菜"):
        """Test dialogue interaction"""
        if not self.session_id:
            print("❌ Cannot test dialogue without a session ID")
            return False
            
        success, response = self.run_test(
            "Start Dialogue",
            "POST",
            "api/start-dialogue",
            200,
            data={
                "session_id": self.session_id,
                "message": message,
                "is_user": True
            }
        )
        if success:
            print(f"AI Response: {response.get('response')}")
            print(f"Translation: {response.get('translation')}")
            print(f"Suggestions count: {len(response.get('suggestions', []))}")
        return success

    def test_end_session(self):
        """Test ending session and getting learning report"""
        if not self.session_id:
            print("❌ Cannot end session without a session ID")
            return False
            
        success, response = self.run_test(
            "End Session",
            "POST",
            f"api/end-session?session_id={self.session_id}",
            200
        )
        if success:
            print(f"Learning report:")
            print(f"  Topic: {response.get('topic')}")
            print(f"  Vocabulary learned: {response.get('vocabulary_learned')}")
            print(f"  Dialogue turns: {response.get('dialogue_turns')}")
            print(f"  Overall score: {response.get('overall_score')}")
            print(f"  Strengths: {response.get('strengths')}")
        return success

    def test_get_session(self):
        """Test retrieving session data"""
        if not self.session_id:
            print("❌ Cannot get session without a session ID")
            return False
            
        success, response = self.run_test(
            "Get Session",
            "GET",
            f"api/session/{self.session_id}",
            200
        )
        if success:
            print(f"Session data retrieved successfully")
            print(f"  Topic: {response.get('topic')}")
            print(f"  Status: {response.get('status')}")
        return success

def main():
    # Get backend URL from frontend .env file
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                backend_url = line.strip().split('=')[1].strip('"\'')
                break
    
    print(f"Using backend URL: {backend_url}")
    
    # Setup tester
    tester = ChineseLearnAPITester(backend_url)
    
    # Run tests
    tests = [
        tester.test_health_check,
        tester.test_get_languages,
        tester.test_generate_vocabulary,
        tester.test_start_dialogue,
        tester.test_end_session,
        tester.test_get_session
    ]
    
    for test_func in tests:
        test_func()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
