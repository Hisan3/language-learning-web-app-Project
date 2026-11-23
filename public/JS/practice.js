// Initialize Supabase Client
const SUPABASE_URL = 'https://qtsfceqredvwhwukaugu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0c2ZjZXFyZWR2d2h3dWthdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDE5NjcsImV4cCI6MjA3ODA3Nzk2N30.iJJ4wcah6BHs_ubjhwG-VU9Nj4XueSq5_Ro4sFm8QF8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data storage (will be populated from API)
let flashcards = [];
let quizQuestions = [];
let sentenceExercises = [];
let fillBlankQuestions = [];

// Store set IDs for tracking which sets are active
let flashcardSetIds = [];
let quizSetIds = [];
let sentenceMakingSetIds = [];
let fillBlankSetIds = [];

// Load all practice data from backend
async function loadPracticeData() {
    try {
        console.log('Loading practice data from backend...');
        
        // 🌍 Get user's timezone
        const userTimezone = TimezoneUtils.getUserTimezone();
        console.log(`🌍 User timezone: ${userTimezone}`);
        TimezoneUtils.logTimezoneInfo(); // Log detailed timezone info
        
        // Fetch flashcards (with timezone parameter)
        const flashcardsRes = await fetch(`/api/practice/flashcards?timezone=${encodeURIComponent(userTimezone)}`);
        if (!flashcardsRes.ok) {
            throw new Error(`Flashcards API returned ${flashcardsRes.status}: ${flashcardsRes.statusText}`);
        }
        const flashcardsData = await flashcardsRes.json();
        console.log('Flashcards API response:', flashcardsData);
        
        if (flashcardsData.success && flashcardsData.flashcardSets && flashcardsData.flashcardSets.length > 0) {
            // Flatten all cards from all published sets into one array
            flashcards = [];
            flashcardSetIds = [];
            flashcardsData.flashcardSets.forEach(set => {
                if (set.cards && Array.isArray(set.cards)) {
                    set.cards.forEach(card => {
                        // Only add cards with valid word and meaning
                        if (card.word && card.meaning) {
                            flashcards.push({
                                word: card.word,
                                meaning: card.meaning,
                                example: card.example || '',
                                category: set.category || 'General'
                            });
                        } else {
                            console.warn('⚠️ Skipping invalid flashcard:', card);
                        }
                    });
                }
                flashcardSetIds.push(set.id);
            });
            console.log(`✅ Loaded ${flashcards.length} flashcards from ${flashcardsData.flashcardSets.length} sets`);
        } else {
            console.log('⚠️ No flashcard sets found');
        }

        // Fetch quizzes (with timezone parameter)
        const quizzesRes = await fetch(`/api/practice/quizzes?timezone=${encodeURIComponent(userTimezone)}`);
        if (!quizzesRes.ok) {
            throw new Error(`Quizzes API returned ${quizzesRes.status}: ${quizzesRes.statusText}`);
        }
        const quizzesData = await quizzesRes.json();
        console.log('Quizzes API response:', quizzesData);
        
        if (quizzesData.success && quizzesData.quizSets && quizzesData.quizSets.length > 0) {
            // Flatten all questions from all published sets into one array
            quizQuestions = [];
            quizSetIds = [];
            quizzesData.quizSets.forEach(set => {
                if (set.questions && Array.isArray(set.questions)) {
                    set.questions.forEach(q => {
                        // Only add questions with valid data
                        if (q.question && Array.isArray(q.options) && q.options.length > 0 && q.correct) {
                            quizQuestions.push({
                                question: q.question,
                                options: q.options,
                                correct: q.correct
                            });
                        } else {
                            console.warn('⚠️ Skipping invalid quiz question:', q);
                        }
                    });
                }
                quizSetIds.push(set.id);
            });
            console.log(`✅ Loaded ${quizQuestions.length} quiz questions from ${quizzesData.quizSets.length} sets`);
        } else {
            console.log('⚠️ No quiz sets found');
        }

        // Fetch exercises (with timezone parameter)
        const exercisesRes = await fetch(`/api/practice/sentence-making?timezone=${encodeURIComponent(userTimezone)}`);
        if (!exercisesRes.ok) {
            throw new Error(`Sentence-making API returned ${exercisesRes.status}: ${exercisesRes.statusText}`);
        }
        const exercisesData = await exercisesRes.json();
        console.log('Exercises API response:', exercisesData);
        
        if (exercisesData.success && exercisesData.sentenceSets && exercisesData.sentenceSets.length > 0) {
            // Flatten all exercises from all published sets into one array
            sentenceExercises = [];
            sentenceMakingSetIds = [];
            exercisesData.sentenceSets.forEach(set => {
                if (set.exercises && Array.isArray(set.exercises)) {
                    set.exercises.forEach(e => {
                        // Only add exercises with valid data
                        if (Array.isArray(e.words) && e.words.length > 0 && e.correct) {
                            sentenceExercises.push({
                                words: e.words,
                                correctSentence: e.correct,
                                hint: e.hint || ''
                            });
                        } else {
                            console.warn('⚠️ Skipping invalid sentence exercise:', e);
                        }
                    });
                }
                sentenceMakingSetIds.push(set.id);
            });
            console.log(`✅ Loaded ${sentenceExercises.length} exercises from ${exercisesData.sentenceSets.length} sets`);
        } else {
            console.log('⚠️ No sentence making sets found');
        }

        // Fetch fill blanks (with timezone parameter)
        const fillblanksRes = await fetch(`/api/practice/fill-blanks?timezone=${encodeURIComponent(userTimezone)}`);
        if (!fillblanksRes.ok) {
            throw new Error(`Fill-blanks API returned ${fillblanksRes.status}: ${fillblanksRes.statusText}`);
        }
        const fillblanksData = await fillblanksRes.json();
        console.log('Fill-blanks API response:', fillblanksData);
        
        if (fillblanksData.success && fillblanksData.fillblankSets && fillblanksData.fillblankSets.length > 0) {
            // Flatten all questions from all published sets into one array
            fillBlankQuestions = [];
            fillBlankSetIds = [];
            fillblanksData.fillblankSets.forEach(set => {
                if (set.questions && Array.isArray(set.questions)) {
                    set.questions.forEach(q => {
                        // Only add questions with valid sentence and answer
                        if (q.sentence && q.answer) {
                            fillBlankQuestions.push({
                                sentence: q.sentence,
                                answer: q.answer,
                                hint: q.hint || ''
                            });
                        } else {
                            console.warn('⚠️ Skipping invalid fill-blank question:', q);
                        }
                    });
                }
                fillBlankSetIds.push(set.id);
            });
            console.log(`✅ Loaded ${fillBlankQuestions.length} fill blank questions from ${fillblanksData.fillblankSets.length} sets`);
        } else {
            console.log('⚠️ No fill blank sets found');
        }

        // Check if we have any data at all
        const hasAnyData = flashcards.length > 0 || quizQuestions.length > 0 || 
                          sentenceExercises.length > 0 || fillBlankQuestions.length > 0;

        if (hasAnyData) {
            console.log('✅ Practice data loaded successfully!');
            initializeApp();
        } else {
            console.log('⚠️ No practice data found in database. Please add some practice sets from the admin panel.');
            showNoDataMessage();
        }
    } catch (error) {
        console.error('❌ Error loading practice data:', error);
        console.error('Error details:', error.message);
        showErrorMessage(error.message);
    }
}

// Show message when no data is available
function showNoDataMessage() {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div style="background: white; border-radius: 30px; padding: 40px; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="font-size: 80px; margin-bottom: 20px;">📚</div>
                <h1 style="margin: 0 0 15px 0; color: #2d3748;">No Practice Sets Available</h1>
                <p style="color: #64748b; margin: 0 0 25px 0;">
                    There are no practice sets currently scheduled. Please contact your administrator or check back later.
                </p>
                <button onclick="location.reload()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 12px 30px; border-radius: 12px; font-size: 16px; cursor: pointer; font-weight: 600;">
                    Refresh Page
                </button>
            </div>
        </div>
    `;
}

// Show error message
function showErrorMessage(errorMessage) {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <div style="background: white; border-radius: 30px; padding: 40px; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="font-size: 80px; margin-bottom: 20px;">❌</div>
                <h1 style="margin: 0 0 15px 0; color: #2d3748;">Connection Error</h1>
                <p style="color: #64748b; margin: 0 0 25px 0;">
                    Unable to load practice data. Please check your internet connection and try again.
                </p>
                <p style="color: #dc2626; margin: 0 0 25px 0;">
                    Error Details: ${errorMessage}
                </p>
                <button onclick="location.reload()" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border: none; padding: 12px 30px; border-radius: 12px; font-size: 16px; cursor: pointer; font-weight: 600;">
                    Try Again
                </button>
            </div>
        </div>
    `;
}

// ============================================
// SAVE USER PRACTICE ACTIVITY TO DATABASE
// ============================================
async function saveUserActivity(activityType, score, totalQuestions, correctAnswers) {
    try {
        // Get user email from Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        const userEmail = session?.user?.email || 'anonymous@learnglow.com';
        const userId = session?.user?.id || null;

        // Determine the appropriate set_id based on activity type
        let setId = null;
        if (activityType === 'Flashcards' && flashcardSetIds.length > 0) {
            setId = flashcardSetIds[0]; // Use first set ID
        } else if (activityType === 'Quiz' && quizSetIds.length > 0) {
            setId = quizSetIds[0];
        } else if (activityType === 'Sentence Making' && sentenceMakingSetIds.length > 0) {
            setId = sentenceMakingSetIds[0];
        } else if (activityType === 'Fill in the Blanks' && fillBlankSetIds.length > 0) {
            setId = fillBlankSetIds[0];
        }

        // If no set_id found, log warning and don't save (database requires it)
        if (!setId) {
            console.warn(`⚠️ [Save Activity] No set_id found for ${activityType}. Skipping save.`);
            return;
        }

        console.log(`[Save Activity] Saving ${activityType} activity for ${userEmail} with set_id: ${setId}`);

        // FIXED: Get user's timezone to send to backend
        const timezone = window.TimezoneUtils?.getUserTimezone() || Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log(`📅 [Practice Activity] Sending timezone: ${timezone}`);

        const response = await fetch('/api/practice/save-activity', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                user_email: userEmail,
                activity_type: activityType,
                set_id: setId, // Now using actual set ID from loaded data
                score: score,
                total_questions: totalQuestions,
                correct_answers: correctAnswers,
                timezone: timezone // FIXED: Pass user's timezone
            })
        });

        const result = await response.json();
        if (result.success) {
            console.log(`✅ [Save Activity] ${activityType} activity saved successfully`);
            
            // Show XP notification with earned XP
            if (result.xp_earned && typeof window.XPSystem !== 'undefined') {
                const message = result.is_repeat 
                    ? `${activityType} (Repeat Attempt)` 
                    : activityType;
                window.XPSystem.showXPNotification(result.xp_earned, message);
            }
        } else {
            console.error(`❌ [Save Activity] Failed to save ${activityType} activity:`, result.error);
        }
    } catch (error) {
        console.error(`❌ [Save Activity] Error saving ${activityType} activity:`, error);
    }
}

// Initialize the app after data is loaded
function initializeApp() {
    // Update totals in performance data
    performanceData.flashcards.total = flashcards.length;
    performanceData.quiz.total = quizQuestions.length;
    performanceData.exercise.total = sentenceExercises.length;
    performanceData.fillBlanks.total = fillBlankQuestions.length;

    // Render initial states - Show message if no data available
    if (flashcards.length > 0) {
        renderFlashcard();
    } else {
        document.getElementById('flashcard-body').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📚</div>
                <h3 style="color: #581c87; margin-bottom: 10px;">No Flashcards Available</h3>
                <p style="color: #64748b;">Check back later for today's flashcard set!</p>
            </div>
        `;
    }
    
    if (quizQuestions.length > 0) {
        renderQuiz();
        updateQuizProgress();
    } else {
        document.getElementById('quiz-questions').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📝</div>
                <h3 style="color: #581c87; margin-bottom: 10px;">No Quiz Available</h3>
                <p style="color: #64748b;">Check back later for today's quiz!</p>
            </div>
        `;
    }
    
    if (sentenceExercises.length > 0) {
        renderExercise();
    } else {
        document.getElementById('word-bank').innerHTML = `
            <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                <div style="font-size: 64px; margin-bottom: 20px;">✍️</div>
                <h3 style="color: #581c87; margin-bottom: 10px;">No Exercises Available</h3>
                <p style="color: #64748b;">Check back later for today's sentence building exercises!</p>
            </div>
        `;
    }
    
    if (fillBlankQuestions.length > 0) {
        renderFillBlanks();
        updateFillBlanksProgress();
    } else {
        document.getElementById('fillblanks-questions').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 64px; margin-bottom: 20px;">📝</div>
                <h3 style="color: #581c87; margin-bottom: 10px;">No Fill in the Blanks Available</h3>
                <p style="color: #64748b;">Check back later for today's fill in the blanks exercises!</p>
            </div>
        `;
    }
    
    // Display random quote
    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    const quoteElements = document.querySelectorAll('.quote-text');
    quoteElements.forEach(el => {
        if (el) el.textContent = `"${randomQuote}"`;
    });
}

// Call loadPracticeData when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadPracticeData();
});

// Motivational Quotes
const motivationalQuotes = [
    "The beautiful thing about learning is that nobody can take it away from you. - B.B. King",
    "Education is the passport to the future, for tomorrow belongs to those who prepare for it today. - Malcolm X",
    "The expert in anything was once a beginner. Keep going!",
    "Success is the sum of small efforts repeated day in and day out. - Robert Collier",
    "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
    "Learning is not attained by chance, it must be sought for with passion. - Abigail Adams",
    "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice. - Brian Herbert",
    "Every accomplishment starts with the decision to try.",
    "Your limitation—it's only your imagination. Push beyond!",
    "Great things never come from comfort zones.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Dream it. Wish it. Do it.",
    "Success doesn't just find you. You have to go out and get it.",
    "Don't stop when you're tired. Stop when you're done.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Do something today that your future self will thank you for.",
    "Little things make big days. Keep practicing!",
    "It's going to be hard, but hard does not mean impossible.",
    "Don't wait for opportunity. Create it through learning.",
    "The secret of getting ahead is getting started. - Mark Twain"
];

// Daily Performance Tracking (for weekly chart)
let dailyPerformance = {
    Mon: null,
    Tue: null,
    Wed: null,
    Thu: null,
    Fri: null,
    Sat: null,
    Sun: null
};

// Get current day
function getCurrentDay() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[new Date().getDay()];
}

// State
let currentFlashcard = 0;
let isFlipped = false;
let quizAnswers = {};
let currentExercise = 0;
let exerciseAnswers = [];
let exerciseScore = 0;
let fillBlankAnswers = {};
let draggedElement = null;
let flashcardsViewed = new Set();
let selectedExerciseWord = null;
let flashcardsCompleted = false;

// Performance tracking
let performanceData = {
    flashcards: { completed: 0, total: 5, score: 0 },
    quiz: { completed: 0, total: 4, score: 0 },
    exercise: { completed: 0, total: 5, score: 0 },
    fillBlanks: { completed: 0, total: 5, score: 0 }
};

// Tab Switching
document.querySelectorAll('.tab-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
        const tabName = trigger.getAttribute('data-tab');
        
        // Update active tab trigger
        document.querySelectorAll('.tab-trigger').forEach(t => t.classList.remove('active'));
        trigger.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
        
        // Initialize charts if analytics tab is opened
        if (tabName === 'analytics') {
            setTimeout(initCharts, 100);
        }
    });
});

// Flashcard Functions
function renderFlashcard() {
    // Validate we have flashcards
    if (!flashcards || flashcards.length === 0) {
        console.error('No flashcards available');
        return;
    }
    
    const card = flashcards[currentFlashcard];
    
    // Validate card data
    if (!card || !card.word) {
        console.error('Invalid flashcard data:', card);
        return;
    }
    
    const flashcardBody = document.getElementById('flashcard-body');
    
    document.getElementById('flashcard-category').textContent = card.category || 'General';
    document.getElementById('flashcard-counter').textContent = `${currentFlashcard + 1} / ${flashcards.length}`;
    
    if (!isFlipped) {
        flashcardBody.innerHTML = `
            <div class="flashcard-front">
                <h2 id="flashcard-word">${card.word}</h2>
                <p class="flashcard-hint">Click to reveal meaning</p>
            </div>
        `;
    } else {
        flashcardBody.innerHTML = `
            <div class="flashcard-back">
                <h3>${card.word}</h3>
                <p>${card.meaning || 'No definition available'}</p>
                <div class="example-box">
                    <p>"${card.example || 'No example available'}"</p>
                </div>
            </div>
        `;
    }
}

function flipCard() {
    isFlipped = !isFlipped;
    renderFlashcard();
    
    // Track that this flashcard was viewed when flipped
    if (isFlipped) {
        flashcardsViewed.add(currentFlashcard);
        updateFlashcardProgress();
    }
}

function nextCard() {
    isFlipped = false;
    currentFlashcard = (currentFlashcard + 1) % flashcards.length;
    renderFlashcard();
}

function prevCard() {
    isFlipped = false;
    currentFlashcard = (currentFlashcard - 1 + flashcards.length) % flashcards.length;
    renderFlashcard();
}

function updateFlashcardProgress() {
    performanceData.flashcards.completed = flashcardsViewed.size;
    performanceData.flashcards.score = Math.round((flashcardsViewed.size / flashcards.length) * 100);
    
    // 🎉 AWARD XP FOR FLASHCARDS - 10 XP per flashcard
    if (flashcardsViewed.size > 0 && flashcardsViewed.size === flashcards.length && !flashcardsCompleted) {
        flashcardsCompleted = true;
        
        const flashcardsXP = flashcards.length * XPSystem.XP_REWARDS.FLASHCARD;
        XPSystem.awardXP(flashcardsXP, 'Flashcards', {
            set_id: flashcardSetIds[0] || '00000000-0000-0000-0000-000000000000',
            score: performanceData.flashcards.score,
            total_questions: flashcards.length,
            correct_answers: flashcardsViewed.size
        });
        
        updateDailyPerformance();
        initCharts();
    }
}

// Flashcard Event Listeners
document.getElementById('flashcard-body').addEventListener('click', flipCard);
document.getElementById('flip-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    flipCard();
});
document.getElementById('next-btn').addEventListener('click', nextCard);
document.getElementById('prev-btn').addEventListener('click', prevCard);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    const activeTab = document.querySelector('.tab-trigger.active').getAttribute('data-tab');
    
    if (activeTab === 'flashcards') {
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            flipCard();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            nextCard();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevCard();
        }
    }
});

// Quiz Functions
function renderQuiz() {
    const questionsContainer = document.getElementById('quiz-questions');
    questionsContainer.innerHTML = '';
    
    quizQuestions.forEach((q, qIdx) => {
        // Validate question data
        if (!q || !q.question || !Array.isArray(q.options) || q.options.length === 0) {
            console.error(`Quiz question ${qIdx} is missing required fields:`, q);
            return; // Skip this question
        }
        
        const questionDiv = document.createElement('div');
        questionDiv.className = 'quiz-question';
        
        const questionText = document.createElement('p');
        questionText.textContent = `${qIdx + 1}. ${q.question}`;
        questionDiv.appendChild(questionText);
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'quiz-options';
        
        q.options.forEach((option, oIdx) => {
            const optionBtn = document.createElement('button');
            optionBtn.className = 'quiz-option';
            optionBtn.textContent = option;
            
            if (quizAnswers[qIdx] === option) {
                optionBtn.classList.add('selected');
            }
            
            optionBtn.addEventListener('click', () => {
                quizAnswers[qIdx] = option;
                renderQuiz();
                updateQuizProgress();
            });
            
            optionsDiv.appendChild(optionBtn);
        });
        
        questionDiv.appendChild(optionsDiv);
        questionsContainer.appendChild(questionDiv);
    });
}

function updateQuizProgress() {
    const answeredCount = Object.keys(quizAnswers).length;
    document.getElementById('quiz-progress').textContent = `${answeredCount} / ${quizQuestions.length} answered`;
    
    const submitBtn = document.getElementById('submit-quiz');
    submitBtn.disabled = answeredCount !== quizQuestions.length;
}

function calculateScore() {
    let correct = 0;
    quizQuestions.forEach((q, idx) => {
        if (quizAnswers[idx] === q.correct) correct++;
    });
    return correct;
}

function renderQuizResults() {
    const score = calculateScore();
    performanceData.quiz.completed = quizQuestions.length;
    performanceData.quiz.score = Math.round((score / quizQuestions.length) * 100);
    
    // 🎉 AWARD XP FOR QUIZ - 5 XP per correct answer
    const quizXP = XPSystem.calculateQuizXP(score);
    XPSystem.awardXP(quizXP, 'Quiz', {
        set_id: quizSetIds[0] || '00000000-0000-0000-0000-000000000000',
        score: performanceData.quiz.score,
        total_questions: quizQuestions.length,
        correct_answers: score
    });
    
    // Save activity to database (XP is saved in awardXP function)
    // saveUserActivity('Quiz', performanceData.quiz.score, quizQuestions.length, score);
    
    updateDailyPerformance();
    initCharts();
    
    document.getElementById('quiz-score').textContent = `You scored ${score} out of ${quizQuestions.length}`;
    
    const answersContainer = document.getElementById('quiz-answers');
    answersContainer.innerHTML = '';
    
    quizQuestions.forEach((q, idx) => {
        const isCorrect = quizAnswers[idx] === q.correct;
        
        const answerDiv = document.createElement('div');
        answerDiv.className = `answer-item ${isCorrect ? 'correct' : 'incorrect'}`;
        
        answerDiv.innerHTML = `
            <div class="answer-content">
                <svg class="answer-icon ${isCorrect ? 'correct' : 'incorrect'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${isCorrect 
                        ? '<polyline points="20 6 9 17 4 12"></polyline>'
                        : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
                    }
                </svg>
                <div class="answer-text">
                    <p>${q.question}</p>
                    <p class="user-answer">Your answer: <span style="color: ${isCorrect ? '#16a34a' : '#dc2626'}">${quizAnswers[idx]}</span></p>
                    ${!isCorrect ? `<p class="correct-answer">Correct answer: ${q.correct}</p>` : ''}
                </div>
            </div>
        `;
        
        answersContainer.appendChild(answerDiv);
    });
    
    document.getElementById('quiz-content').style.display = 'none';
    document.getElementById('quiz-results').style.display = 'block';
}

function resetQuiz() {
    quizAnswers = {};
    renderQuiz();
    updateQuizProgress();
    document.getElementById('quiz-content').style.display = 'block';
    document.getElementById('quiz-results').style.display = 'none';
}

// Quiz Event Listeners
document.getElementById('submit-quiz').addEventListener('click', renderQuizResults);
document.getElementById('retry-quiz').addEventListener('click', resetQuiz);

// Exercise Functions
function renderExercise() {
    // Validate we have exercises
    if (!sentenceExercises || sentenceExercises.length === 0) {
        console.error('No sentence exercises available');
        return;
    }
    
    const exercise = sentenceExercises[currentExercise];
    
    // Validate exercise data
    if (!exercise || !Array.isArray(exercise.words) || !exercise.correctSentence) {
        console.error(`Sentence exercise ${currentExercise} is missing required fields:`, exercise);
        return;
    }
    
    document.getElementById('exercise-progress').textContent = `Question ${currentExercise + 1} / ${sentenceExercises.length}`;
    
    // Render word bank
    const wordBank = document.getElementById('word-bank');
    wordBank.innerHTML = '';
    
    exercise.words.forEach((word, idx) => {
        const wordChip = document.createElement('div');
        wordChip.className = 'word-chip';
        wordChip.textContent = word;
        wordChip.draggable = true;
        wordChip.dataset.word = word;
        wordChip.dataset.index = idx;
        
        // Drag handlers
        wordChip.addEventListener('dragstart', handleDragStart);
        wordChip.addEventListener('dragend', handleDragEnd);
        
        // Click handler
        wordChip.addEventListener('click', handleWordClick);
        
        wordBank.appendChild(wordChip);
    });
    
    // Clear drop zone
    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = '<p class="drop-hint">Drag or click words here to build your sentence</p>';
    
    // Hide feedback
    const feedback = document.getElementById('exercise-feedback');
    feedback.classList.remove('show', 'correct', 'incorrect');
    
    // Update navigation buttons
    document.getElementById('prev-exercise').disabled = currentExercise === 0;
    document.getElementById('next-exercise').textContent = currentExercise === sentenceExercises.length - 1 ? 'Finish' : 'Next Question';
}

function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleWordClick(e) {
    const wordChip = e.target;
    
    // Don't allow clicking used words
    if (wordChip.classList.contains('used')) return;
    
    const dropZone = document.getElementById('drop-zone');
    
    // Remove hint if present
    const hint = dropZone.querySelector('.drop-hint');
    if (hint) hint.remove();
    
    // Clone and add to drop zone
    const clone = wordChip.cloneNode(true);
    clone.draggable = false;
    clone.classList.remove('word-chip');
    clone.classList.add('word-chip');
    
    clone.addEventListener('click', function() {
        this.remove();
        // Re-enable original word
        wordChip.classList.remove('used');
        if (dropZone.children.length === 0) {
            dropZone.innerHTML = '<p class="drop-hint">Drag or click words here to build your sentence</p>';
        }
    });
    
    dropZone.appendChild(clone);
    
    // Mark original as used
    wordChip.classList.add('used');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    e.target.closest('.drop-zone')?.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.target.closest('.drop-zone')?.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();
    
    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.remove('drag-over');
    
    if (draggedElement) {
        // Remove hint if present
        const hint = dropZone.querySelector('.drop-hint');
        if (hint) hint.remove();
        
        // Clone and add to drop zone
        const clone = draggedElement.cloneNode(true);
        clone.draggable = false;
        clone.addEventListener('click', function() {
            this.remove();
            // Re-enable original word
            draggedElement.classList.remove('used');
            if (dropZone.children.length === 0) {
                dropZone.innerHTML = '<p class="drop-hint">Drag or click words here to build your sentence</p>';
            }
        });
        
        dropZone.appendChild(clone);
        
        // Mark original as used
        draggedElement.classList.add('used');
    }
    
    return false;
}

// Set up drop zone
const dropZone = document.getElementById('drop-zone');
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragenter', handleDragEnter);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);

// Clear sentence
document.getElementById('clear-sentence').addEventListener('click', () => {
    const dropZone = document.getElementById('drop-zone');
    dropZone.innerHTML = '<p class="drop-hint">Drag or click words here to build your sentence</p>';
    
    // Re-enable all words
    document.querySelectorAll('.word-chip').forEach(chip => {
        chip.classList.remove('used');
    });
    
    // Hide feedback
    const feedback = document.getElementById('exercise-feedback');
    feedback.classList.remove('show', 'correct', 'incorrect');
});

// Check answer
document.getElementById('check-sentence').addEventListener('click', () => {
    const dropZone = document.getElementById('drop-zone');
    const words = Array.from(dropZone.children)
        .filter(el => el.classList.contains('word-chip'))
        .map(el => el.textContent.toLowerCase().trim());
    
    const userAnswer = words.join(' ');
    const correctAnswer = sentenceExercises[currentExercise].correctSentence;
    
    const feedback = document.getElementById('exercise-feedback');
    const isCorrect = userAnswer === correctAnswer;
    
    feedback.classList.add('show');
    feedback.classList.remove('correct', 'incorrect');
    feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
        feedback.innerHTML = '<p>✅ Correct! Well done!</p>';
        exerciseAnswers[currentExercise] = true;
    } else {
        feedback.innerHTML = `<p>❌ Not quite right. The correct answer is: "${correctAnswer}"</p>`;
        exerciseAnswers[currentExercise] = false;
    }
});

// Exercise navigation
document.getElementById('prev-exercise').addEventListener('click', () => {
    if (currentExercise > 0) {
        currentExercise--;
        renderExercise();
    }
});

document.getElementById('next-exercise').addEventListener('click', () => {
    if (currentExercise < sentenceExercises.length - 1) {
        currentExercise++;
        renderExercise();
    } else {
        // Show results
        showExerciseResults();
    }
});

function showExerciseResults() {
    const correctCount = exerciseAnswers.filter(a => a === true).length;
    exerciseScore = correctCount;
    
    performanceData.exercise.completed = sentenceExercises.length;
    performanceData.exercise.score = Math.round((correctCount / sentenceExercises.length) * 100);
    
    // 🎉 AWARD XP FOR SENTENCE MAKING - 15 XP per exercise
    const exerciseXP = correctCount * XPSystem.XP_REWARDS.EXERCISE;
    XPSystem.awardXP(exerciseXP, 'Sentence Making', {
        set_id: sentenceMakingSetIds[0] || '00000000-0000-0000-0000-000000000000',
        score: performanceData.exercise.score,
        total_questions: sentenceExercises.length,
        correct_answers: correctCount
    });
    
    updateDailyPerformance();
    initCharts();
    
    document.getElementById('exercise-score').textContent = `You scored ${correctCount} out of ${sentenceExercises.length}`;
    document.getElementById('exercise-content').style.display = 'none';
    document.getElementById('exercise-results').style.display = 'block';
}

document.getElementById('retry-exercise').addEventListener('click', () => {
    currentExercise = 0;
    exerciseAnswers = [];
    exerciseScore = 0;
    renderExercise();
    document.getElementById('exercise-content').style.display = 'block';
    document.getElementById('exercise-results').style.display = 'none';
});

// Fill in the Blanks Functions
function renderFillBlanks() {
    const questionsContainer = document.getElementById('fillblanks-questions');
    questionsContainer.innerHTML = '';
    
    fillBlankQuestions.forEach((q, qIdx) => {
        // Validate that question has required fields
        if (!q.sentence || typeof q.sentence !== 'string') {
            console.error(`Fill-blank question ${qIdx} is missing or has invalid 'sentence' field:`, q);
            return; // Skip this question
        }
        
        const questionDiv = document.createElement('div');
        questionDiv.className = 'fillblank-question';
        
        const parts = q.sentence.split('___');
        const sentenceHTML = `
            <div class="fillblank-text">
                ${qIdx + 1}. ${parts[0]}
                <input 
                    type="text" 
                    class="fillblank-input" 
                    data-index="${qIdx}"
                    placeholder="..."
                    value="${fillBlankAnswers[qIdx] || ''}"
                />
                ${parts[1] || ''}
            </div>
            <span class="fillblank-hint">💡 ${q.hint || ''}</span>
        `;
        
        questionDiv.innerHTML = sentenceHTML;
        
        const input = questionDiv.querySelector('.fillblank-input');
        input.addEventListener('input', (e) => {
            fillBlankAnswers[qIdx] = e.target.value;
            updateFillBlanksProgress();
        });
        
        questionsContainer.appendChild(questionDiv);
    });
}

function updateFillBlanksProgress() {
    const answeredCount = Object.keys(fillBlankAnswers).filter(key => fillBlankAnswers[key].trim() !== '').length;
    document.getElementById('fillblanks-progress').textContent = `${answeredCount} / ${fillBlankQuestions.length} answered`;
    
    const submitBtn = document.getElementById('submit-fillblanks');
    submitBtn.disabled = answeredCount !== fillBlankQuestions.length;
}

function calculateFillBlanksScore() {
    let correct = 0;
    fillBlankQuestions.forEach((q, idx) => {
        if (fillBlankAnswers[idx] && fillBlankAnswers[idx].trim().toLowerCase() === q.answer.toLowerCase()) {
            correct++;
        }
    });
    return correct;
}

function renderFillBlanksResults() {
    const score = calculateFillBlanksScore();
    
    performanceData.fillBlanks.completed = fillBlankQuestions.length;
    performanceData.fillBlanks.score = Math.round((score / fillBlankQuestions.length) * 100);
    
    // 🎉 AWARD XP FOR FILL IN THE BLANKS - 10 XP per correct answer
    const fillBlanksXP = score * XPSystem.XP_REWARDS.FILL_BLANK;
    XPSystem.awardXP(fillBlanksXP, 'Fill in the Blanks', {
        set_id: fillBlankSetIds[0] || '00000000-0000-0000-0000-000000000000',
        score: performanceData.fillBlanks.score,
        total_questions: fillBlankQuestions.length,
        correct_answers: score
    });
    
    updateDailyPerformance();
    initCharts();
    
    document.getElementById('fillblanks-score').textContent = `You scored ${score} out of ${fillBlankQuestions.length}`;
    
    const answersContainer = document.getElementById('fillblanks-answers');
    answersContainer.innerHTML = '';
    
    fillBlankQuestions.forEach((q, idx) => {
        const userAnswer = fillBlankAnswers[idx] || '';
        const isCorrect = userAnswer.trim().toLowerCase() === q.answer.toLowerCase();
        
        const answerDiv = document.createElement('div');
        answerDiv.className = `answer-item ${isCorrect ? 'correct' : 'incorrect'}`;
        
        answerDiv.innerHTML = `
            <div class="answer-content">
                <svg class="answer-icon ${isCorrect ? 'correct' : 'incorrect'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${isCorrect 
                        ? '<polyline points="20 6 9 17 4 12"></polyline>'
                        : '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>'
                    }
                </svg>
                <div class="answer-text">
                    <p>${q.sentence.replace('___', `<strong>${q.answer}</strong>`)}</p>
                    <p class="user-answer">Your answer: <span style="color: ${isCorrect ? '#16a34a' : '#dc2626'}">${userAnswer}</span></p>
                    ${!isCorrect ? `<p class="correct-answer">Correct answer: ${q.answer}</p>` : ''}
                </div>
            </div>
        `;
        
        answersContainer.appendChild(answerDiv);
    });
    
    document.getElementById('fillblanks-content').style.display = 'none';
    document.getElementById('fillblanks-results').style.display = 'block';
}

function resetFillBlanks() {
    fillBlankAnswers = {};
    renderFillBlanks();
    updateFillBlanksProgress();
    document.getElementById('fillblanks-content').style.display = 'block';
    document.getElementById('fillblanks-results').style.display = 'none';
}

// Fill in the Blanks Event Listeners
document.getElementById('submit-fillblanks').addEventListener('click', renderFillBlanksResults);
document.getElementById('retry-fillblanks').addEventListener('click', resetFillBlanks);

// Analytics Charts
let weeklyChart = null;
let categoryChart = null;

function updateDailyPerformance() {
    // Calculate average performance from all completed activities
    const currentDay = getCurrentDay();
    let totalScore = 0;
    let count = 0;
    
    if (performanceData.flashcards.completed > 0) {
        totalScore += performanceData.flashcards.score;
        count++;
    }
    if (performanceData.quiz.completed > 0) {
        totalScore += performanceData.quiz.score;
        count++;
    }
    if (performanceData.exercise.completed > 0) {
        totalScore += performanceData.exercise.score;
        count++;
    }
    if (performanceData.fillBlanks.completed > 0) {
        totalScore += performanceData.fillBlanks.score;
        count++;
    }
    
    if (count > 0) {
        dailyPerformance[currentDay] = Math.round(totalScore / count);
    }
}

function initCharts() {
    // Destroy existing charts if they exist
    if (weeklyChart) weeklyChart.destroy();
    if (categoryChart) categoryChart.destroy();
    
    // Prepare weekly data - use actual performance or 0 for days without practice
    const weeklyData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
        return dailyPerformance[day] !== null ? dailyPerformance[day] : 0;
    });
    
    // Weekly Performance Report Line Chart
    const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
    weeklyChart = new Chart(weeklyCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Performance %',
                data: weeklyData,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#a855f7',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#a855f7',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: window.innerWidth < 640 ? 1.5 : 2,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#581c87',
                    bodyColor: '#374151',
                    borderColor: '#e9d5ff',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Performance: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: '#f3f4f6',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: window.innerWidth < 640 ? 10 : 12
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: window.innerWidth < 640 ? 10 : 12
                        }
                    }
                }
            }
        }
    });
    
    // Calculate category data from performance
    const categoryData = [
        { name: 'Flashcards', value: performanceData.flashcards.score, color: '#a78bfa' },
        { name: 'Quiz', value: performanceData.quiz.score, color: '#6ee7b7' },
        { name: 'Exercise', value: performanceData.exercise.score, color: '#93c5fd' },
        { name: 'Fill Blanks', value: performanceData.fillBlanks.score, color: '#fda4af' }
    ];
    
    // Time by Category Pie Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const isMobile = window.innerWidth < 640;
    
    categoryChart = new Chart(categoryCtx, {
        type: 'pie',
        data: {
            labels: categoryData.map(d => d.name),
            datasets: [{
                data: categoryData.map(d => d.value),
                backgroundColor: categoryData.map(d => d.color),
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: isMobile ? 1.2 : 1.5,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: '#fff',
                    titleColor: '#581c87',
                    bodyColor: '#374151',
                    borderColor: '#e9d5ff',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return `${label}: ${value}%`;
                        }
                    }
                }
            },
            layout: {
                padding: isMobile ? {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                } : {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            }
        }
    });
    
    // Create custom legend
    const legendContainer = document.getElementById('category-legend');
    legendContainer.innerHTML = '';
    
    categoryData.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${item.color}"></div>
            <span class="legend-text">${item.name} ${item.value}%</span>
        `;
        legendContainer.appendChild(legendItem);
    });
}

// Resize handler to update charts on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const activeTab = document.querySelector('.tab-trigger.active')?.getAttribute('data-tab');
        if (activeTab === 'analytics' && (weeklyChart || categoryChart)) {
            initCharts();
        }
    }, 250);
});