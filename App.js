import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';

// 사소한 입력 차이(앞뒤 공백, 대소문자, 중복 공백)는 정답으로 인정하기 위한 정규화 함수
function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

// 실시간 API(DummyJSON, 번역 프록시)를 하나도 불러오지 못했을 때
// 화면이 멈추지 않도록 대신 보여줄 로컬 백업 명언. id는 실제 DummyJSON id와
// 겹치지 않도록 음수로 정했다.
const BACKUP_QUOTES = [
  {
    id: -1,
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
    translation: '위대한 일을 하는 유일한 방법은 당신이 하는 일을 사랑하는 것이다.',
  },
  {
    id: -2,
    quote: 'Life is what happens when you are busy making other plans.',
    author: 'John Lennon',
    translation: '인생이란 다른 계획을 세우느라 바쁠 때 일어나는 일이다.',
  },
  {
    id: -3,
    quote: 'It always seems impossible until it is done.',
    author: 'Nelson Mandela',
    translation: '무엇이든 해내기 전까지는 항상 불가능해 보인다.',
  },
];

function pickBackupQuote(excludeId) {
  const candidates = BACKUP_QUOTES.filter((quote) => quote.id !== excludeId);
  const pool = candidates.length > 0 ? candidates : BACKUP_QUOTES;
  return pool[Math.floor(Math.random() * pool.length)];
}

const REQUEST_TIMEOUT_MS = 5000;

// fetch는 기본적으로 타임아웃이 없어서, AbortController로 5초 뒤 요청을 강제로 취소한다.
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// 직전 명언과 같은 명언이 오면 다른 명언이 나올 때까지 최대 2번까지 다시 요청한다.
async function fetchRandomQuote(excludeId, retriesLeft = 2) {
  const response = await fetchWithTimeout('https://dummyjson.com/quotes/random');

  if (!response.ok) {
    throw new Error(`명언 API 응답 오류: ${response.status}`);
  }

  const data = await response.json();

  if (excludeId != null && data.id === excludeId && retriesLeft > 0) {
    return fetchRandomQuote(excludeId, retriesLeft - 1);
  }

  return data;
}

const TRANSLATE_API_URL = 'https://web-delta-teal-83.vercel.app/api/translate';

// 아포스트로피 등 특수문자가 URL을 깨뜨리지 않도록 encodeURIComponent로 인코딩해서 호출한다.
async function fetchTranslation(text) {
  const response = await fetchWithTimeout(`${TRANSLATE_API_URL}?text=${encodeURIComponent(text)}`);

  if (!response.ok) {
    throw new Error(`번역 API 응답 오류: ${response.status}`);
  }

  const data = await response.json();
  return data.translatedText;
}

// 명언과 번역을 하나의 묶음으로 가져온다. 둘 중 하나라도 실패하면(네트워크
// 오류, 타임아웃으로 인한 abort, 404/429/500 같은 에러 상태 포함) 예외가
// 위로 던져지고, 화면에서는 이걸 잡아 백업 명언으로 대체한다.
async function loadQuoteWithTranslation(excludeId) {
  const quoteData = await fetchRandomQuote(excludeId);
  const translation = await fetchTranslation(quoteData.quote);
  return {
    id: quoteData.id,
    quote: quoteData.quote,
    author: quoteData.author,
    translation,
  };
}

export default function App() {
  const [currentQuote, setCurrentQuote] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isMemorizing, setIsMemorizing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong' | 'empty'
  const [speechError, setSpeechError] = useState(null);

  const loadNewQuote = async () => {
    setIsLoading(true);
    setLoadError(null);
    setIsMemorizing(false);
    setUserInput('');
    setResult(null);
    setSpeechError(null);

    try {
      const newQuote = await loadQuoteWithTranslation(currentQuote?.id);
      setCurrentQuote(newQuote);
    } catch (error) {
      setCurrentQuote(pickBackupQuote(currentQuote?.id));
      setLoadError('실시간 명언을 불러오지 못해 저장된 명언을 대신 보여드려요.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNewQuote();
  }, []);

  const handleListen = async () => {
    if (!currentQuote) {
      return;
    }

    setSpeechError(null);

    const voices = await Speech.getAvailableVoicesAsync();
    const englishVoice =
      voices.find((voice) => voice.language === 'en-US') ??
      voices.find((voice) => voice.language.startsWith('en'));

    if (!englishVoice) {
      setSpeechError('이 기기에서는 음성 재생을 지원하지 않습니다');
      return;
    }

    Speech.speak(currentQuote.quote, {
      voice: englishVoice.identifier,
      language: englishVoice.language,
    });
  };

  const handleStartMemorize = () => {
    setIsMemorizing(true);
    setUserInput('');
    setResult(null);
  };

  const handleInputChange = (text) => {
    setUserInput(text);
    if (result === 'empty') {
      setResult(null);
    }
  };

  const handleCheckAnswer = () => {
    if (!userInput.trim()) {
      setResult('empty');
      return;
    }

    const isCorrect = normalize(userInput) === normalize(currentQuote.quote);
    setResult(isCorrect ? 'correct' : 'wrong');
    setIsMemorizing(false);
  };

  return (
    <View style={styles.container}>
      {isLoading && <ActivityIndicator size="large" style={styles.spinner} />}

      {!isLoading && currentQuote && (
        <>
          <Text style={styles.author}>{currentQuote.author}</Text>

          {isMemorizing ? (
            <>
              <TextInput
                style={styles.input}
                value={userInput}
                onChangeText={handleInputChange}
                placeholder="기억나는 대로 입력해보세요"
                multiline
                autoFocus
              />
              <TouchableOpacity style={styles.confirmButton} onPress={handleCheckAnswer}>
                <Text style={styles.buttonText}>확인</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.quote}>{currentQuote.quote}</Text>
          )}

          <Text style={styles.translation}>{currentQuote.translation}</Text>

          {result === 'correct' && <Text style={styles.correctText}>정답!</Text>}
          {result === 'wrong' && <Text style={styles.wrongText}>다시 도전해보세요</Text>}
          {result === 'empty' && <Text style={styles.hintText}>먼저 입력해주세요</Text>}
        </>
      )}

      {loadError && (
        <>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadNewQuote}>
            <Text style={styles.buttonText}>다시 시도</Text>
          </TouchableOpacity>
        </>
      )}

      {speechError && <Text style={styles.errorText}>{speechError}</Text>}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, !currentQuote && styles.buttonDisabled]}
          onPress={handleListen}
          disabled={!currentQuote}
        >
          <Text style={styles.buttonText}>듣기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, !currentQuote && styles.buttonDisabled]}
          onPress={handleStartMemorize}
          disabled={!currentQuote}
        >
          <Text style={styles.buttonText}>외워서 써보기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={loadNewQuote}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>다른 명언 보기</Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  spinner: {
    marginBottom: 24,
  },
  author: {
    fontSize: 16,
    color: '#888',
    marginBottom: 12,
  },
  quote: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  translation: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#c0392b',
    textAlign: 'center',
    marginBottom: 12,
  },
  input: {
    width: '100%',
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  confirmButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#2f7d3c',
    marginBottom: 16,
  },
  retryButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#e67e22',
    marginBottom: 16,
  },
  correctText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2f7d3c',
    marginBottom: 16,
  },
  wrongText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c0392b',
    marginBottom: 16,
  },
  hintText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e67e22',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4a6fa5',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#a9b6c9',
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
