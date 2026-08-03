import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';

const QUOTES = [
  {
    quote: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
    translation: '위대한 일을 하는 유일한 방법은 당신이 하는 일을 사랑하는 것이다.',
  },
  {
    quote: 'Life is what happens when you are busy making other plans.',
    author: 'John Lennon',
    translation: '인생이란 다른 계획을 세우느라 바쁠 때 일어나는 일이다.',
  },
  {
    quote: 'It always seems impossible until it is done.',
    author: 'Nelson Mandela',
    translation: '무엇이든 해내기 전까지는 항상 불가능해 보인다.',
  },
];

// 사소한 입력 차이(앞뒤 공백, 대소문자, 중복 공백)는 정답으로 인정하기 위한 정규화 함수
function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMemorizing, setIsMemorizing] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [result, setResult] = useState(null); // null | 'correct' | 'wrong'

  const currentQuote = QUOTES[currentIndex];

  const handleNextQuote = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % QUOTES.length);
    setIsMemorizing(false);
    setUserInput('');
    setResult(null);
  };

  const handleStartMemorize = () => {
    setIsMemorizing(true);
    setUserInput('');
    setResult(null);
  };

  const handleCheckAnswer = () => {
    const isCorrect = normalize(userInput) === normalize(currentQuote.quote);
    setResult(isCorrect ? 'correct' : 'wrong');
    setIsMemorizing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.author}>{currentQuote.author}</Text>

      {isMemorizing ? (
        <>
          <TextInput
            style={styles.input}
            value={userInput}
            onChangeText={setUserInput}
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

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={() => {}}>
          <Text style={styles.buttonText}>듣기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleStartMemorize}>
          <Text style={styles.buttonText}>외워서 써보기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleNextQuote}>
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
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
