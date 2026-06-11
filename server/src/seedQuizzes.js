export const seedQuizzes = [
  {
    id: 'seed-general',
    title: 'General Knowledge',
    emoji: '🌍',
    questions: [
      {
        text: 'What is the capital of Australia?',
        answers: ['Sydney', 'Canberra', 'Melbourne', 'Perth'],
        correctIndex: 1,
        timeLimit: 20,
      },
      {
        text: 'Which planet is known as the Red Planet?',
        answers: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
        correctIndex: 2,
        timeLimit: 15,
      },
      {
        text: 'How many continents are there on Earth?',
        answers: ['5', '6', '7', '8'],
        correctIndex: 2,
        timeLimit: 15,
      },
      {
        text: 'Who painted the Mona Lisa?',
        answers: ['Vincent van Gogh', 'Pablo Picasso', 'Claude Monet', 'Leonardo da Vinci'],
        correctIndex: 3,
        timeLimit: 20,
      },
      {
        text: 'What is the largest ocean on Earth?',
        answers: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
        correctIndex: 3,
        timeLimit: 15,
      },
      {
        text: 'In which year did the first human walk on the Moon?',
        answers: ['1959', '1965', '1969', '1973'],
        correctIndex: 2,
        timeLimit: 20,
      },
    ],
  },
  {
    id: 'seed-science',
    title: 'Science & Nature',
    emoji: '🔬',
    questions: [
      {
        text: 'What is the chemical symbol for gold?',
        answers: ['Go', 'Gd', 'Au', 'Ag'],
        correctIndex: 2,
        timeLimit: 15,
      },
      {
        text: 'How many bones does an adult human body have?',
        answers: ['186', '206', '226', '246'],
        correctIndex: 1,
        timeLimit: 20,
      },
      {
        text: 'Which gas do plants absorb from the atmosphere?',
        answers: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
        correctIndex: 2,
        timeLimit: 15,
      },
      {
        text: 'What is the fastest land animal?',
        answers: ['Cheetah', 'Lion', 'Pronghorn', 'Greyhound'],
        correctIndex: 0,
        timeLimit: 15,
      },
      {
        text: 'What force keeps planets in orbit around the Sun?',
        answers: ['Magnetism', 'Gravity', 'Friction', 'Inertia'],
        correctIndex: 1,
        timeLimit: 15,
      },
      {
        text: 'Water boils at 100°C at sea level. At what temperature does it freeze?',
        answers: ['-10°C', '0°C', '4°C', '10°C'],
        correctIndex: 1,
        timeLimit: 10,
      },
    ],
  },
  {
    id: 'seed-javascript',
    title: 'JavaScript Basics',
    emoji: '⚡',
    questions: [
      {
        text: 'Which keyword declares a block-scoped variable that cannot be reassigned?',
        answers: ['var', 'let', 'const', 'static'],
        correctIndex: 2,
        timeLimit: 20,
      },
      {
        text: 'What does `typeof null` return?',
        answers: ['"null"', '"object"', '"undefined"', '"number"'],
        correctIndex: 1,
        timeLimit: 20,
      },
      {
        text: 'Which array method creates a new array with elements that pass a test?',
        answers: ['map()', 'forEach()', 'filter()', 'reduce()'],
        correctIndex: 2,
        timeLimit: 20,
      },
      {
        text: 'What is the result of `2 + "2"` in JavaScript?',
        answers: ['4', '"22"', 'NaN', 'TypeError'],
        correctIndex: 1,
        timeLimit: 15,
      },
      {
        text: 'Which company originally created JavaScript?',
        answers: ['Microsoft', 'Sun Microsystems', 'Netscape', 'Google'],
        correctIndex: 2,
        timeLimit: 20,
      },
      {
        text: 'What does JSON stand for?',
        answers: [
          'JavaScript Object Notation',
          'Java Standard Output Network',
          'JavaScript Online Nodes',
          'Java Serialized Object Namespace',
        ],
        correctIndex: 0,
        timeLimit: 15,
      },
    ],
  },
];
