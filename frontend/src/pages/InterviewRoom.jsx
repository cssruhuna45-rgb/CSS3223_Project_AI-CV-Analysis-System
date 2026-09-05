import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Send,
  Clock,
  ChevronRight,
  Brain,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { interviewAPI } from '../services/api';
import StepBar from '../components/StepBar';
import ModelAnswer from '../components/ModelAnswer';

const MAX_QUESTIONS = 5;
const TOTAL_TIME = 120;


// ============================================================
// SAFE SESSION STORAGE JSON PARSER
// ============================================================

const getStoredJson = (key) => {
  try {
    const value = sessionStorage.getItem(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(
      `[Frontend] Failed to parse sessionStorage key "${key}":`,
      error
    );

    return null;
  }
};


// ============================================================
// INTERVIEW ROOM
// ============================================================

export default function InterviewRoom() {
  const navigate = useNavigate();

  // ==========================================================
  // STATE
  // ==========================================================

  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState('');
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');

  const [listening, setListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitted, setSubmitted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [aiTyping, setAiTyping] = useState(false);
  const [displayedQ, setDisplayedQ] = useState('');

  // ----------------------------------------------------------
  // MODEL ANSWER
  //
  // The expected answer for the question just submitted. Fetched on
  // submit rather than with the next question, so the candidate sees it
  // while their own answer is still in front of them - and so the last
  // question gets one too, before the scorecard.
  // ----------------------------------------------------------

  const [modelAnswer, setModelAnswer] = useState(null);
  const [modelAnswerLoading, setModelAnswerLoading] = useState(false);
  const [modelAnswerError, setModelAnswerError] = useState('');

  // ----------------------------------------------------------
  // LISTEN TO THE QUESTION
  //
  // A real interviewer asks out loud, and a candidate who practises by
  // reading is not practising the part they will actually do. The
  // browser speaks the question on request rather than automatically:
  // autoplay is blocked without a gesture, and being talked at the
  // moment a page loads is worse than a button.
  // ----------------------------------------------------------

  const [speaking, setSpeaking] = useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Prevent duplicate START request
  const interviewStartedRef = useRef(false);

  // Prevent duplicate ANSWER request
  const submittingAnswerRef = useRef(false);

  // Prevent duplicate MODEL ANSWER request
  const modelAnswerRef = useRef(false);

  // The utterance currently being spoken, so it can be cancelled
  const utteranceRef = useRef(null);

  // ----------------------------------------------------------
  // MICROPHONE STATE THAT MUST NOT LIVE IN REACT STATE
  //
  // The recognition callbacks are registered once and would close over
  // whatever the values were at that moment, so they are read through
  // refs instead.
  // ----------------------------------------------------------

  // Whether the candidate still wants to be recording. Chrome ends a
  // recognition session after a few seconds of silence even with
  // continuous = true, which used to look like the button had simply
  // stopped working. This is what tells onend to start it again.
  const shouldListenRef = useRef(false);

  // Whatever was already in the box when recording started, so speech
  // is added to typed text instead of wiping it.
  const baseAnswerRef = useRef('');

  // Everything recognised so far in this recording. A restarted session
  // begins its results from scratch, so the earlier speech has to be
  // kept here or it disappears mid-answer.
  const finalTranscriptRef = useRef('');

  // Speech synthesis is missing in some browsers; the button hides
  // rather than failing when the candidate presses it.
  const speechSupported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window;

  // ==========================================================
  // SESSION STORAGE
  // ==========================================================

  const jobRole =
    sessionStorage.getItem('jobRole') ||
    'Software Developer';

  const resumeText =
    sessionStorage.getItem('resumeText') || '';

  const storedJobDescription =
    sessionStorage.getItem('jobDescription') || '';

  const jobDescription =
    storedJobDescription.trim() ||
    `I am interviewing for a ${jobRole} position. Please ask me relevant technical and behavioral interview questions suited for this role.`;

  // ==========================================================
  // SKILL GAP CONTEXT
  // ==========================================================

  const skillGapResult =
    getStoredJson('skillGapResult');

  const selectedJobField =
    sessionStorage.getItem('selectedJobField') ||
    skillGapResult?.job_field ||
    '';

  const selectedJobFieldName =
    sessionStorage.getItem('selectedJobFieldName') ||
    skillGapResult?.job_field_name ||
    jobRole;

  const matchedSkills =
    Array.isArray(skillGapResult?.matched_skills)
      ? skillGapResult.matched_skills
      : [];

  const relatedSkills =
    Array.isArray(skillGapResult?.related_skills)
      ? skillGapResult.related_skills
      : [];

  const missingSkills =
    Array.isArray(skillGapResult?.missing_skills)
      ? skillGapResult.missing_skills
      : [];

  const additionalSkills =
    Array.isArray(skillGapResult?.additional_skills)
      ? skillGapResult.additional_skills
      : [];

  // ==========================================================
  // DEBUG SKILL GAP CONTEXT
  // ==========================================================

  useEffect(() => {
    console.log(
      '================================================'
    );

    console.log(
      '[Frontend] Interview Skill Gap Context'
    );

    console.log(
      '[Frontend] Selected Job Field:',
      selectedJobField
    );

    console.log(
      '[Frontend] Selected Job Field Name:',
      selectedJobFieldName
    );

    console.log(
      '[Frontend] Matched Skills:',
      matchedSkills
    );

    console.log(
      '[Frontend] Related Skills:',
      relatedSkills
    );

    console.log(
      '[Frontend] Missing Skills:',
      missingSkills
    );

    console.log(
      '[Frontend] Additional Skills:',
      additionalSkills
    );

    console.log(
      '================================================'
    );
  }, [
    selectedJobField,
    selectedJobFieldName,
  ]);

  // ==========================================================
  // START INTERVIEW
  // ==========================================================

  useEffect(() => {
    // Stop duplicate API call
    if (interviewStartedRef.current) {
      console.log(
        '[Frontend] Start request already sent.'
      );

      return;
    }

    interviewStartedRef.current = true;

    const startInterview = async () => {
      try {
        console.log(
          '[Frontend] Starting interview...'
        );

        console.log(
          '[Frontend] Job description:',
          jobDescription
        );

        console.log(
          '[Frontend] Resume length:',
          resumeText.length
        );

        console.log(
          '[Frontend] Job field:',
          selectedJobField
        );

        console.log(
          '[Frontend] Matched skills:',
          matchedSkills
        );

        console.log(
          '[Frontend] Related skills:',
          relatedSkills
        );

        console.log(
          '[Frontend] Missing skills:',
          missingSkills
        );

        console.log(
          '[Frontend] Additional skills:',
          additionalSkills
        );

        setLoading(true);
        setError('');

        // ====================================================
        // IMPORTANT
        // Send Skill Gap context to FastAPI
        // ====================================================

        const data = await interviewAPI.start(
          jobDescription.trim(),
          resumeText,
          selectedJobField,
          matchedSkills,
          relatedSkills,
          missingSkills,
          additionalSkills
        );

        console.log(
          '[Frontend] Start response:',
          data
        );

        const newSessionId =
          data?.session_id;

        const newQuestion =
          data?.question?.question ||
          data?.question ||
          '';

        if (!newSessionId) {
          throw new Error(
            'Session ID was not returned by AI service.'
          );
        }

        if (!newQuestion) {
          throw new Error(
            'Question was not returned by AI service.'
          );
        }

        setSessionId(newSessionId);
        setQuestion(newQuestion);

        // Store session ID
        sessionStorage.setItem(
          'sessionId',
          newSessionId
        );

        console.log(
          '[Frontend] Session ID:',
          newSessionId
        );

        console.log(
          '[Frontend] Question:',
          newQuestion
        );

      } catch (err) {
        console.error(
          '[Frontend] Start interview error:',
          err
        );

        setError(
          err?.message ||
          'Could not start the interview.'
        );

      } finally {
        setLoading(false);
      }
    };

    startInterview();

  }, []);

  // ==========================================================
  // TYPEWRITER
  // ==========================================================

  useEffect(() => {
    if (!question) {
      setDisplayedQ('');
      setAiTyping(false);
      return;
    }

    setDisplayedQ('');
    setAiTyping(true);

    let index = 0;

    const interval = setInterval(() => {
      index += 1;

      setDisplayedQ(
        question.slice(0, index)
      );

      if (index >= question.length) {
        clearInterval(interval);
        setAiTyping(false);
      }

    }, 22);

    return () => {
      clearInterval(interval);
    };

  }, [question]);

  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeLeft(TOTAL_TIME);

    timerRef.current = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };

  }, [qIndex]);

  // ==========================================================
  // CLEANUP MICROPHONE ON UNMOUNT
  // ==========================================================

  useEffect(() => {
    return () => {
      // Cleared first: otherwise onend restarts recognition on a page
      // that is already gone.
      shouldListenRef.current = false;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.log(
            '[Frontend] Microphone cleanup completed.'
          );
        }
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // ==========================================================
  // LISTEN TO THE QUESTION
  // ==========================================================

  const stopSpeaking = () => {
    if (!speechSupported) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (error) {
      console.log(
        '[Frontend] Nothing was being spoken.'
      );
    }

    utteranceRef.current = null;

    setSpeaking(false);
  };

  const toggleListenQuestion = () => {
    if (!speechSupported) {
      return;
    }

    if (speaking) {
      stopSpeaking();

      return;
    }

    const text = (question || displayedQ || '').trim();

    if (!text) {
      return;
    }

    // The microphone would otherwise transcribe the question straight
    // into the answer box.
    if (listening) {
      stopRecognition();
    }

    // Chrome keeps a queue; without this a second press stacks another
    // reading behind the first.
    window.speechSynthesis.cancel();

    const utterance =
      new window.SpeechSynthesisUtterance(text);

    utterance.lang = 'en-US';

    // Slightly under natural pace: interview questions carry detail the
    // candidate is meant to catch the first time.
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeaking(false);
    };

    utterance.onerror = (event) => {
      console.error(
        '[Frontend] Speech synthesis error:',
        event.error
      );

      utteranceRef.current = null;
      setSpeaking(false);
    };

    utteranceRef.current = utterance;

    setSpeaking(true);

    window.speechSynthesis.speak(utterance);

    console.log(
      '[Frontend] Reading question aloud.'
    );
  };

  // ----------------------------------------------------------
  // STOP SPEAKING ON QUESTION CHANGE AND UNMOUNT
  //
  // Without this the previous question keeps being read over the new
  // one, and it carries on after the candidate leaves the page.
  // ----------------------------------------------------------

  useEffect(() => {
    return () => {
      if (speechSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch (error) {
          console.log(
            '[Frontend] Speech cleanup completed.'
          );
        }
      }

      utteranceRef.current = null;
      setSpeaking(false);
    };
  }, [qIndex, speechSupported]);

  // ==========================================================
  // MICROPHONE
  // ==========================================================

  // What each failure actually means for the candidate. These used to
  // go to the console only, so a blocked microphone or a page served
  // over plain http looked identical to a button that did nothing.
  const MIC_ERRORS = {
    'not-allowed':
      'Microphone access was blocked. Allow the microphone for this site in your browser settings, then try again.',
    'service-not-allowed':
      'Your browser refused speech recognition. This usually means the page is not served over https or localhost.',
    'audio-capture':
      'No microphone was found. Check that one is connected and selected as the input device.',
    network:
      'Speech recognition needs an internet connection and could not reach the service.',
    aborted: '',
    'no-speech': '',
  };

  const stopRecognition = () => {
    shouldListenRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log(
          '[Frontend] Recognition already stopped.'
        );
      }
    }

    setListening(false);
  };

  const toggleMic = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        'Speech recognition is not supported in this browser. Please use Chrome or Edge, or type your answer.'
      );

      return;
    }

    // The API exists in more browsers than it works in: served from
    // anything other than https or localhost, Chrome accepts the call
    // and then fails silently.
    if (!window.isSecureContext) {
      setError(
        'The microphone needs a secure page. Open the app on http://localhost:3000 (not an IP address) or over https.'
      );

      return;
    }

    // --------------------------------------------------------
    // STOP RECORDING
    // --------------------------------------------------------

    if (listening) {
      stopRecognition();

      return;
    }

    // --------------------------------------------------------
    // START RECORDING
    //
    // The question is stopped first: a reading still in progress would
    // be picked up by the microphone and typed into the answer.
    // --------------------------------------------------------

    stopSpeaking();

    setError('');

    // Speech is appended to whatever has already been typed rather
    // than replacing it.
    baseAnswerRef.current = answer ? `${answer.trim()} ` : '';
    finalTranscriptRef.current = '';

    const recognition =
      new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log(
        '[Frontend] Microphone started.'
      );

      setListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';

      // Only results from this event's index onwards are new; earlier
      // ones are already in finalTranscriptRef.
      for (
        let i = event.resultIndex;
        i < event.results.length;
        i += 1
      ) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          finalTranscriptRef.current += text;
        } else {
          interim += text;
        }
      }

      setAnswer(
        (
          baseAnswerRef.current +
          finalTranscriptRef.current +
          interim
        ).trimStart()
      );
    };

    recognition.onerror = (event) => {
      console.error(
        '[Frontend] Speech recognition error:',
        event.error
      );

      const message = MIC_ERRORS[event.error];

      // "no-speech" and "aborted" are normal: Chrome raises them on a
      // quiet pause, and onend restarts the session.
      if (message === undefined) {
        setError(
          `Microphone error: ${event.error}. Please type your answer instead.`
        );
      } else if (message) {
        setError(message);
      }

      // A permission or transport failure will not fix itself on a
      // restart, so stop asking.
      if (message) {
        shouldListenRef.current = false;
        setListening(false);
      }
    };

    recognition.onend = () => {
      // Chrome ends the session on silence. If the candidate never
      // pressed stop, start listening again so a pause mid-answer does
      // not quietly end the recording.
      if (shouldListenRef.current) {
        try {
          recognition.start();

          console.log(
            '[Frontend] Microphone resumed after pause.'
          );

          return;
        } catch (error) {
          console.log(
            '[Frontend] Could not resume microphone:',
            error
          );
        }
      }

      setListening(false);
    };

    recognitionRef.current = recognition;

    shouldListenRef.current = true;

    try {
      recognition.start();
    } catch (error) {
      console.error(
        '[Frontend] Microphone error:',
        error
      );

      shouldListenRef.current = false;

      setError(
        'The microphone could not be started. Check that no other tab is using it, then try again.'
      );

      setListening(false);
    }
  };

  // ==========================================================
  // REVEAL EXPECTED ANSWER
  //
  // Runs when the candidate presses Submit. The answer itself only
  // reaches the AI service when they move on, so this call is what
  // closes the loop for the question they just finished.
  //
  // It deliberately does not block anything: if it fails, the panel
  // says so and Next Question still works.
  // ==========================================================

  const revealModelAnswer = async () => {
    const submittedAnswer = answer.trim();

    if (!submittedAnswer) {
      return;
    }

    setSubmitted(true);

    // The question has been answered; nobody wants to hear it read out
    // over the expected answer.
    stopSpeaking();

    if (listening) {
      stopRecognition();
    }

    if (modelAnswerRef.current) {
      return;
    }

    modelAnswerRef.current = true;

    setModelAnswer(null);
    setModelAnswerError('');
    setModelAnswerLoading(true);

    try {
      console.log(
        '[Frontend] Fetching expected answer for question',
        qIndex + 1
      );

      const data =
        await interviewAPI.getModelAnswer(
          sessionId,
          question,
          submittedAnswer,
          selectedJobField
        );

      console.log(
        '[Frontend] Expected answer:',
        data
      );

      if (data?.generated === false) {
        setModelAnswerError(
          data?.error ||
          'The expected answer could not be generated.'
        );
      } else {
        setModelAnswer(data);
      }

    } catch (err) {
      console.error(
        '[Frontend] Expected answer error:',
        err
      );

      setModelAnswerError(
        err?.message ||
        'Could not reach the AI service.'
      );

    } finally {
      setModelAnswerLoading(false);
      modelAnswerRef.current = false;
    }
  };

  // ==========================================================
  // SUBMIT ANSWER
  // ==========================================================

  const handleSubmit = async () => {
    if (!answer.trim()) {
      return;
    }

    if (!sessionId) {
      setError(
        'Interview session is not ready.'
      );

      return;
    }

    // Prevent duplicate answer request
    if (submittingAnswerRef.current) {
      return;
    }

    submittingAnswerRef.current = true;

    setLoading(true);
    setError('');

    // --------------------------------------------------------
    // Stop microphone
    // --------------------------------------------------------

    stopRecognition();

    // --------------------------------------------------------
    // Stop timer
    // --------------------------------------------------------

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    try {
      console.log(
        '[Frontend] Submitting answer...'
      );

      console.log(
        '[Frontend] Session:',
        sessionId
      );

      console.log(
        '[Frontend] Question:',
        qIndex + 1
      );

      console.log(
        '[Frontend] Answer length:',
        answer.trim().length
      );

      // ======================================================
      // LAST QUESTION
      // ======================================================

      if (qIndex + 1 >= MAX_QUESTIONS) {
        console.log(
          '[Frontend] Final question.'
        );

        // Submit final answer
        await interviewAPI.submitAnswer(
          sessionId,
          answer.trim()
        );

        console.log(
          '[Frontend] Final answer submitted.'
        );

        // Finish interview
        const finishData =
          await interviewAPI.finish(
            sessionId
          );

        console.log(
          '[Frontend] Interview finished:',
          finishData
        );

        // Store session ID
        sessionStorage.setItem(
          'sessionId',
          sessionId
        );

        // Hand the scorecard its data. Without this the result of
        // the whole interview is thrown away and /scorecard has
        // nothing to show.
        sessionStorage.setItem(
          'interviewResult',
          JSON.stringify(finishData)
        );

        navigate('/scorecard');

        return;
      }

      // ======================================================
      // NORMAL QUESTION
      // ======================================================

      const data =
        await interviewAPI.submitAnswer(
          sessionId,
          answer.trim()
        );

      console.log(
        '[Frontend] Next question response:',
        data
      );

      const nextQuestion =
        data?.question?.question ||
        data?.question ||
        '';

      if (!nextQuestion) {
        throw new Error(
          'Next question was not returned by AI service.'
        );
      }

      setQuestion(nextQuestion);

      setQIndex(
        (current) => current + 1
      );

      setAnswer('');
      setSubmitted(false);

      // The panel belongs to the question that just ended.
      setModelAnswer(null);
      setModelAnswerError('');

    } catch (err) {
      console.error(
        '[Frontend] Submit answer error:',
        err
      );

      setError(
        err?.message ||
        'Failed to submit answer. Please try again.'
      );

    } finally {
      setLoading(false);
      submittingAnswerRef.current = false;
    }
  };

  // ==========================================================
  // NEXT QUESTION
  // ==========================================================

  const handleNext = () => {
    if (loading) {
      return;
    }

    if (!answer.trim()) {
      return;
    }

    handleSubmit();
  };

  // ==========================================================
  // TIMER UI
  // ==========================================================

  const timerPct =
    (timeLeft / TOTAL_TIME) * 100;

  const timerColor =
    timeLeft > 30
      ? '#D8C4B6'
      : '#F5EFE7';

  const mins = String(
    Math.floor(timeLeft / 60)
  ).padStart(2, '0');

  const secs = String(
    timeLeft % 60
  ).padStart(2, '0');

  // ==========================================================
  // INITIAL LOADING
  // ==========================================================

  if (loading && !question) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
        }}
      >
        <Brain
          size={32}
          color="#D8C4B6"
        />

        <p
          style={{
            color: '#F5EFE7',
            fontSize: 16,
          }}
        >
          AI is preparing your interview...
        </p>

        <p
          style={{
            color: '#D8C4B6',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          Your interview is being generated using
          your selected job field and skill-gap analysis.
        </p>

        {selectedJobFieldName && (
          <p
            style={{
              color: '#D8C4B6',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            Target role: {selectedJobFieldName}
          </p>
        )}

        {error && (
          <div
            style={{
              marginTop: 10,
              padding: '12px 16px',
              borderRadius: 10,
              background:
                'rgba(245,239,231,0.08)',
              border:
                '1px solid rgba(245,239,231,0.25)',
              color: '#F5EFE7',
              fontSize: 13,
              maxWidth: 600,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: '40px 24px',
      }}
    >
      <StepBar current={3} />

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#D8C4B6',
                animation:
                  'pulse 2s infinite',
              }}
            />

            <span
              style={{
                fontSize: 13,
                color: '#D8C4B6',
                fontWeight: 500,
              }}
            >
              Live Interview · {selectedJobFieldName}
            </span>
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Question {qIndex + 1} of{' '}
            {MAX_QUESTIONS}
          </h1>
        </div>

        {/* TIMER */}

        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 72,
              height: 72,
            }}
          >
            <svg
              width="72"
              height="72"
              style={{
                transform:
                  'rotate(-90deg)',
              }}
            >
              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke="#3E5879"
                strokeWidth="4"
              />

              <circle
                cx="36"
                cy="36"
                r="30"
                fill="none"
                stroke={timerColor}
                strokeWidth="4"
                strokeDasharray={`${
                  2 * Math.PI * 30
                }`}
                strokeDashoffset={`${
                  2 *
                  Math.PI *
                  30 *
                  (1 -
                    timerPct / 100)
                }`}
              />
            </svg>

            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection:
                  'column',
                alignItems:
                  'center',
                justifyContent:
                  'center',
              }}
            >
              <Clock
                size={12}
                color={timerColor}
              />

              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: timerColor,
                }}
              >
                {mins}:{secs}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================
          PROGRESS
      ==================================================== */}

      <div
        style={{
          height: 4,
          background: '#3E5879',
          borderRadius: 2,
          marginBottom: 32,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 2,
            background: '#D8C4B6',
            width: `${
              ((qIndex + 1) /
                MAX_QUESTIONS) *
              100
            }%`,
            transition:
              'width 0.4s ease',
          }}
        />
      </div>

      {/* ====================================================
          AI QUESTION
      ==================================================== */}

      <div
        className="card"
        style={{
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
          background: '#000000',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: '#D8C4B6',
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems:
              'flex-start',
            paddingTop: 8,
          }}
        >
          <div
            style={{
              flex: 1,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: 8,
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#D8C4B6',
                }}
              >
                AI Interviewer
              </span>

              {/* ==========================================
                  LISTEN

                  Reads the question aloud, so the candidate
                  practises hearing it the way it will be
                  asked. Hidden when the browser has no
                  speech synthesis.
              ========================================== */}

              {speechSupported && (
                <button
                  onClick={
                    toggleListenQuestion
                  }
                  disabled={
                    aiTyping ||
                    !question
                  }
                  title={
                    speaking
                      ? 'Stop reading the question'
                      : 'Listen to the question'
                  }
                  style={{
                    display: 'flex',
                    alignItems:
                      'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 600,
                    padding:
                      '3px 10px',
                    borderRadius: 12,
                    cursor:
                      aiTyping ||
                      !question
                        ? 'default'
                        : 'pointer',
                    background:
                      speaking
                        ? 'rgba(74,222,128,0.14)'
                        : 'rgba(216,196,182,0.1)',
                    color: speaking
                      ? '#4ADE80'
                      : '#D8C4B6',
                    border: `1px solid ${
                      speaking
                        ? 'rgba(74,222,128,0.4)'
                        : 'rgba(216,196,182,0.28)'
                    }`,
                    opacity:
                      aiTyping ||
                      !question
                        ? 0.45
                        : 1,
                  }}
                >
                  {speaking ? (
                    <>
                      <VolumeX
                        size={13}
                      />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2
                        size={13}
                      />
                      Listen
                    </>
                  )}
                </button>
              )}

              {aiTyping && (
                <div
                  style={{
                    display: 'flex',
                    gap: 3,
                    alignItems:
                      'center',
                  }}
                >
                  {[0, 1, 2].map(
                    (i) => (
                      <div
                        key={i}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius:
                            '50%',
                          background:
                            '#D8C4B6',
                          animation: `bounce 1s ease-in-out ${
                            i *
                            0.15
                          }s infinite`,
                        }}
                      />
                    )
                  )}
                </div>
              )}
            </div>

            <p
              style={{
                fontSize: 17,
                lineHeight: 1.7,
                fontWeight: 500,
              }}
            >
              {displayedQ}
            </p>
          </div>
        </div>
      </div>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems:
              'center',
            background:
              'rgba(245,239,231,0.08)',
            border:
              '1px solid rgba(245,239,231,0.25)',
            borderRadius: 10,
            padding:
              '12px 16px',
            marginBottom: 16,
          }}
        >
          <AlertCircle
            size={15}
            color="#F5EFE7"
          />

          <p
            style={{
              fontSize: 13,
              color: '#F5EFE7',
            }}
          >
            {error}
          </p>
        </div>
      )}

      {/* ====================================================
          ANSWER
      ==================================================== */}

      {!submitted ? (
        <div
          className="card"
          style={{
            marginBottom: 20,
            background: '#000000',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#F5EFE7',
              }}
            >
              Your Answer
            </span>

            <div
              style={{
                display: 'flex',
                alignItems:
                  'center',
                gap: 6,
              }}
            >
              {listening && (
                <span
                  className="badge badge-red"
                  style={{
                    fontSize: 11,
                  }}
                >
                  ● Recording
                </span>
              )}

              <span
                style={{
                  fontSize: 12,
                  color: '#F5EFE7',
                }}
              >
                {answer.length} chars
              </span>
            </div>
          </div>

          <textarea
            className="input"
            rows={5}
            placeholder="Type your answer here, or use the microphone to speak..."
            value={answer}
            onChange={(e) =>
              setAnswer(
                e.target.value
              )
            }
            disabled={loading}
            style={{
              resize: 'vertical',
              lineHeight: 1.6,
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 14,
            }}
          >
            {/* MICROPHONE */}

            <button
              className="btn"
              onClick={toggleMic}
              disabled={loading}
              style={{
                background:
                  listening
                    ? 'rgba(245,239,231,0.15)'
                    : 'rgba(216,196,182,0.1)',
                color:
                  listening
                    ? '#F5EFE7'
                    : '#D8C4B6',
                border: `1px solid ${
                  listening
                    ? 'rgba(245,239,231,0.3)'
                    : 'rgba(216,196,182,0.2)'
                }`,
                flex: 1,
                justifyContent:
                  'center',
              }}
            >
              {listening ? (
                <>
                  <MicOff size={16} />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic size={16} />
                  Use Microphone
                </>
              )}
            </button>

            {/* SUBMIT */}

            <button
              className="btn btn-primary"
              onClick={revealModelAnswer}
              disabled={
                !answer.trim() ||
                loading
              }
              style={{
                flex: 2,
                justifyContent:
                  'center',
                opacity:
                  !answer.trim() ||
                  loading
                    ? 0.5
                    : 1,
              }}
            >
              <Send size={15} />
              Submit Answer
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* ==================================================
              ANSWER RECORDED
          ================================================== */}

          <div
            style={{
              background:
                'rgba(216,196,182,0.08)',
              border:
                '1px solid rgba(216,196,182,0.25)',
              borderRadius: 12,
              padding:
                '16px 20px',
              display: 'flex',
              gap: 12,
              alignItems:
                'flex-start',
              marginBottom: 20,
            }}
          >
            <CheckCircle
              size={20}
              color="#D8C4B6"
              style={{
                flexShrink: 0,
                marginTop: 2,
              }}
            />

            <div>
              <p
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 4,
                }}
              >
                Answer recorded!
              </p>

              <p
                style={{
                  color: '#F5EFE7',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                {answer}
              </p>
            </div>
          </div>

          {/* ==================================================
              EXPECTED ANSWER

              What a strong answer to this question looks like,
              retrieved from the knowledge base and written by the
              model. Shown before the next question so the candidate
              can compare it with what they just said.
          ================================================== */}

          <ModelAnswer
            data={modelAnswer}
            loading={modelAnswerLoading}
            error={modelAnswerError}
          />

          {/* ==================================================
              NEXT
          ================================================== */}

          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={loading}
            style={{
              width: '100%',
              justifyContent:
                'center',
              padding: '13px',
              fontSize: 15,
            }}
          >
            {loading ? (
              'Loading.....'
            ) : qIndex + 1 >=
              MAX_QUESTIONS ? (
              'View Scorecard...'
            ) : (
              <>
                Next Question
                <ChevronRight
                  size={16}
                />
              </>
            )}
          </button>
        </div>
      )}

      {/* ====================================================
          STAR TIP
      ==================================================== */}

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems:
            'flex-start',
          marginTop: 16,
          padding:
            '12px 16px',
          background:
            'rgba(245,239,231,0.06)',
          border:
            '1px solid rgba(245,239,231,0.15)',
          borderRadius: 10,
        }}
      >
        <AlertCircle
          size={15}
          color="#F5EFE7"
          style={{
            flexShrink: 0,
            marginTop: 1,
          }}
        />

        <p
          style={{
            fontSize: 12,
            color: '#F5EFE7',
            lineHeight: 1.6,
          }}
        >
          Tip: Structure your
          answer using the{' '}
          <strong
            style={{
              color: '#F5EFE7',
            }}
          >
            STAR method
          </strong>{' '}
          — Situation, Task,
          Action, Result.
        </p>
      </div>

      {/* ====================================================
          ANIMATIONS
      ==================================================== */}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }

          50% {
            opacity: 0.4;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  );
}