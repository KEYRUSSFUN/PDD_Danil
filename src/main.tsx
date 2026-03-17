import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'

type Question = {
  id: number
  text: string
  options: string[]
  correctIndex: number
  explanation?: string
}

type Ticket = {
  id: number
  title: string
  questions: Question[]
}

type TicketsData = {
  tickets: Ticket[]
}

// Функция для перемешивания массива (алгоритм Фишера-Йетса)
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Функция для создания перемешанной версии вопроса
const createShuffledQuestion = (question: Question): Question => {
  // Создаем индексы и перемешиваем их
  const originalIndices = Array.from({ length: question.options.length }, (_, i) => i)
  const shuffledIndices = shuffleArray(originalIndices)
  
  // Создаем перемешанный массив вариантов
  const shuffledOptions = shuffledIndices.map(idx => question.options[idx])
  
  // Находим новый индекс правильного ответа
  const shuffledCorrectIndex = shuffledIndices.findIndex(idx => idx === question.correctIndex)
  
  return {
    ...question,
    options: shuffledOptions,
    correctIndex: shuffledCorrectIndex
  }
}

// Функция для перемешивания всех вопросов в билете
const shuffleTicketQuestions = (ticket: Ticket): Ticket => {
  return {
    ...ticket,
    questions: ticket.questions.map(q => createShuffledQuestion(q))
  }
}

const App: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, number | null>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const res = await fetch('/PDD_Danil/questions.json')
        if (!res.ok) {
          throw new Error('Не удалось загрузить questions.json')
        }
        const data: TicketsData = await res.json()
        
        // Перемешиваем варианты в вопросах СРАЗУ после загрузки
        const shuffledTickets = data.tickets.map(ticket => shuffleTicketQuestions(ticket))
        setTickets(shuffledTickets)
        setSelectedTicketId(shuffledTickets?.[0]?.id ?? null)
      } catch (e: any) {
        setError(e.message || 'Ошибка загрузки вопросов')
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, []) // Пустой массив зависимостей - выполняется один раз после загрузки страницы

  const currentTicket = tickets.find((t) => t.id === selectedTicketId) || null
  const currentQuestion =
    currentTicket && currentTicket.questions[currentQuestionIndex]

  const handleSelectTicket = (id: number) => {
    setSelectedTicketId(id)
    setAnswers({})
    setShowResults(false)
    setCurrentQuestionIndex(0)
  }

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    if (showResults) return
    setAnswers((prev) => ({
      ...prev,
      [String(questionId)]: optionIndex,
    }))
  }

  const handleCheck = () => {
    setShowResults(true)
  }

  const handleReset = () => {
    setAnswers({})
    setShowResults(false)
    setCurrentQuestionIndex(0)
  }

  const handleNext = () => {
    if (!currentTicket) return
    setCurrentQuestionIndex((prev) =>
      prev < currentTicket.questions.length - 1 ? prev + 1 : prev,
    )
  }

  const handlePrev = () => {
    setCurrentQuestionIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }

  const handleGoToQuestion = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  const totalQuestions = currentTicket?.questions.length ?? 0
  const correctCount =
    currentTicket?.questions.reduce((acc, q) => {
      const chosen = answers[String(q.id)]
      return acc + (chosen === q.correctIndex ? 1 : 0)
    }, 0) ?? 0

  // Функция для получения сообщения о результате
  const getResultMessage = () => {
    if (!showResults) return null;
    
    if (correctCount === totalQuestions) {
      return 'Отлично! Без ошибок.';
    }
    if (correctCount >= totalQuestions - 1 && correctCount < totalQuestions) {
      return 'Очень хорошо, почти без ошибок.';
    }
    if (correctCount >= Math.round(totalQuestions * 0.6) && correctCount < totalQuestions - 1) {
      return 'Хороший результат, но есть, что повторить.';
    }
    if (correctCount < Math.round(totalQuestions * 0.6)) {
      return 'Рекомендуется повторить теорию и попробовать ещё раз.';
    }
    return null;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>
            {currentTicket
              ? `${currentTicket.title} ПДД 2026`
              : 'ПДД тестирование'}
          </h1>
          <p className="subtitle">Решайте билеты онлайн, как на DROM</p>
        </div>
      </header>

      <main className="app-main">
        <aside className="tickets-panel">
          <h2>Билеты</h2>
          <div className="tickets-list">
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                className={
                  'ticket-button' +
                  (ticket.id === selectedTicketId ? ' ticket-button--active' : '')
                }
                onClick={() => handleSelectTicket(ticket.id)}
              >
                {ticket.title || `Билет ${ticket.id}`}
                <span className="ticket-questions-count">
                  {ticket.questions.length || 0} вопросов
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="questions-panel">
          {loading && <div className="card info">Загрузка вопросов...</div>}
          {error && !loading && <div className="card error">Ошибка: {error}</div>}

          {!loading && !error && !currentTicket && (
            <div className="card info">
              Нет данных по билетам. Добавьте билеты в <code>public/questions.json</code>.
            </div>
          )}

          {!loading && !error && currentTicket && currentQuestion && (
            <>
              <div className="ticket-header">
                <div>
                  <h2>{currentTicket.title}</h2>
                  <p className="ticket-subtitle">
                    Вопрос {currentQuestionIndex + 1} из {totalQuestions}
                  </p>
                </div>
                <span className="badge badge--soft">
                  Вопросов в билете: {currentTicket.questions.length}
                </span>
              </div>

              <div className="pager">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handlePrev}
                  disabled={currentQuestionIndex === 0}
                >
                  ← Назад
                </button>
                <div className="pager-dots">
                  {currentTicket.questions.map((q, idx) => {
                    const chosen = answers[String(q.id)]
                    const isAnswered = chosen != null
                    const isCorrect =
                      isAnswered && chosen === q.correctIndex

                    let dotClass = 'pager-dot'
                    if (idx === currentQuestionIndex)
                      dotClass += ' pager-dot--active'
                    if (isAnswered)
                      dotClass += ' pager-dot--answered'
                    if (showResults && isCorrect)
                      dotClass += ' pager-dot--correct'
                    if (showResults && isAnswered && !isCorrect)
                      dotClass += ' pager-dot--wrong'

                    return (
                      <button
                        key={q.id}
                        type="button"
                        className={dotClass}
                        onClick={() => handleGoToQuestion(idx)}
                        aria-label={`Вопрос ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleNext}
                  disabled={
                    !currentTicket ||
                    currentQuestionIndex === currentTicket.questions.length - 1
                  }
                >
                  Далее →
                </button>
              </div>

              <article className="question-card">
                <header className="question-header">
                  <span className="question-number">
                    Вопрос {currentQuestionIndex + 1}
                  </span>
                  {showResults && (
                    (() => {
                      const chosen =
                        answers[String(currentQuestion.id)]
                      const isAnswered = chosen != null
                      const isCorrect =
                        isAnswered && chosen === currentQuestion.correctIndex

                      if (!isAnswered) return null

                      return (
                        <span
                          className={
                            'badge ' +
                            (isCorrect ? 'badge--correct' : 'badge--wrong')
                          }
                        >
                          {isCorrect ? 'Верно' : 'Ошибка'}
                        </span>
                      )
                    })()
                  )}
                </header>

                <div className="question-media">
                  <div className="question-media-placeholder">
                    <div className="question-media-icon" />
                    <span>Вопрос без изображения</span>
                  </div>
                </div>

                <p className="question-text">{currentQuestion.text}</p>

                <div className="options-grid">
                  {currentQuestion.options.map((opt, optIdx) => {
                    const chosen = answers[String(currentQuestion.id)]
                    const isChosen = chosen === optIdx
                    const isRightOption =
                      optIdx === currentQuestion.correctIndex

                    let className = 'option-button'
                    if (isChosen) className += ' option-button--selected'
                    if (showResults && isRightOption)
                      className += ' option-button--correct'
                    if (showResults && isChosen && !isRightOption)
                      className += ' option-button--wrong'

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        className={className}
                        onClick={() =>
                          handleSelectAnswer(currentQuestion.id, optIdx)
                        }
                      >
                        <span className="option-letter">
                          {String.fromCharCode(65 + optIdx)} {/* A, B, C, D... */}
                        </span>
                        <span>{opt}</span>
                      </button>
                    )
                  })}
                </div>

                {showResults && currentQuestion.explanation && (
                  <p className="explanation">
                    <strong>Пояснение:</strong> {currentQuestion.explanation}
                  </p>
                )}
              </article>

              <footer className="controls">
                <div className="controls-left">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleCheck}
                    disabled={totalQuestions === 0}
                  >
                    Проверить результат
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleReset}
                  >
                    Сбросить ответы
                  </button>
                </div>

                <div className="controls-right">
                  <div className="score">
                    <span className="score-main">
                      {correctCount} / {totalQuestions}
                    </span>
                    <span className="score-sub">правильных ответов</span>
                    {showResults && (
                      <span className="score-grade">
                        {getResultMessage()}
                      </span>
                    )}
                  </div>
                </div>
              </footer>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)