import { useToast } from '../components/ToastProvider';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Sparkles,
  Trophy,
  Loader2,
  Award,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { interviewAPI } from '../services/api';
import { isApiError, userMessage } from '../services/http';
import { MODEL_ANSWER_UNAVAILABLE, submitOutcome } from './interviewRecovery';
import StepBar from '../components/StepBar';
import ModelAnswer from '../components/ModelAnswer';
import { CodeText, stripBackticks } from '../components/ui';

// Length of a practice interview. A job interview has the recruiter's
// chosen 5-10 questions; the server says how many when it starts.
const MAX_QUESTIONS = 5;
const TOTAL_TIME = 120;

// Sent in place of an answer when the exam clock runs out on an empty
// box, so the interview moves on and the grader scores it as no answer.
const NO_ANSWER_TEXT = 'No answer given (time ran out).';

// The two ways to sit an interview, chosen before it starts.
const MODES = {
  practice: {
    title: 'Practice',
    summary: 'Learn as you go',
    points: [
      'No timer',
      'See the expected answer after each question',
      'Revise your answer before moving on',
      'Not counted in your progress',
    ],
  },
  exam: {
    title: 'Exam',
    summary: 'Like the real thing',
    points: [
      `${TOTAL_TIME / 60} minutes per question`,
      'Expected answers only on the scorecard',
      'When time runs out, your answer is submitted as it is',
      'Counted in your progress',
      'Leaving this page and pasting text are recorded with each answer',
    ],
  },
};

// What the scoring overlay shows while the interview is being graded.
const FINISH_STAGES = [
  { step: 1, label: 'Recording final transcripts and verbal answers' },
  { step: 2, label: 'Benchmarking answers against domain knowledge base' },
  { step: 3, label: 'Grading 4 core competencies (Knowledge, Depth, Reasoning, Clarity)' },
  { step: 4, label: 'Preparing personalized 14-Day Upskilling Roadmap' },
];


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
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // ==========================================================
  // STATE
  // ==========================================================

  // A job interview to continue rather than start: ?resume=<session>.
  // Put in the address once a job interview starts, so a reload comes
  // back to it, and used by My applications' Resume button. Read once.
  const [resumeId] = useState(
    () => new URLSearchParams(location.search).get('resume')
  );

  // Set by the join page when the candidate accepted a recruiter's
  // invite code: { code, title, company, jobField }. Read once, so it
  // survives being cleared from sessionStorage after the start. A
  // resumed interview fills in the title and company from the server.
  const [jobInvite, setJobInvite] = useState(() => (resumeId ? null : getStoredJson('jobInvite')));

  // 'practice' or 'exam'. Null until the candidate chooses; the
  // interview does not start before that. A job interview is always an
  // exam - the server enforces it - so there is no choice to make.
  const [mode, setMode] = useState(() => (resumeId || getStoredJson('jobInvite') ? 'exam' : null));
  const [pendingMode, setPendingMode] = useState('practice');
  const isExam = mode === 'exam';
  // A recruiter's job interview: one attempt, resumable from the server.
  const isJobInterview = Boolean(jobInvite) || Boolean(resumeId);

  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState('');

  // MAX_QUESTIONS until the start response says otherwise.
  const [totalQuestions, setTotalQuestions] = useState(MAX_QUESTIONS);
  const [qIndex, setQIndex] = useState(0);
  const [answer, setAnswer] = useState('');

  const [listening, setListening] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [submitted, setSubmitted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // One action offered beside the error, only where the interview mode
  // supports it: { label, onClick }.
  const [errorAction, setErrorAction] = useState(null);
  // A job interview answer whose arrival could not be confirmed. Until
  // the server is checked, sending it again could record it twice.
  const [unconfirmedAnswer, setUnconfirmedAnswer] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishStep, setFinishStep] = useState(1);

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

  // Seconds the first question has been loading. A busy AI service can
  // take a minute, and a spinner with no change for that long looks
  // like a frozen page.
  const [waitSeconds, setWaitSeconds] = useState(0);

  // ==========================================================
  // REFS
  // ==========================================================

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Keyboard focus is moved to the answer box when a question arrives
  // and to the Next button after submitting, so the whole interview
  // can be done from the keyboard without hunting for the next control.
  const answerRef = useRef(null);
  const nextButtonRef = useRef(null);

  // The exam clock submits once per question when it runs out.
  const autoSubmittedRef = useRef(false);

  // Prevent duplicate START request
  const interviewStartedRef = useRef(false);

  // Prevent duplicate ANSWER request
  const submittingAnswerRef = useRef(false);

  // Prevent duplicate MODEL ANSWER request
  const modelAnswerRef = useRef(false);

  // The utterance currently being spoken, so it can be cancelled
  const utteranceRef = useRef(null);

  // ----------------------------------------------------------
  // INTEGRITY SIGNALS (exam mode only)
  //
  // What the browser saw while the current answer was written: how
  // often and for how long the candidate left the page, and how much
  // they pasted. Sent with the answer and shown to a recruiter beside
  // the score. Nothing is blocked - blocking paste breaks assistive
  // tools and a second device is invisible to a browser anyway - and
  // the candidate is told before the exam starts that this is recorded.
  // ----------------------------------------------------------

  const integrityRef = useRef({ leftPage: 0, awayMs: 0, pastes: 0, pastedChars: 0 });
  const awaySinceRef = useRef(null);

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

  // A skill gap worked out for a different field would steer the
  // questions towards the wrong job, so on a job interview it is only
  // used when it was for the same field as the job.
  const storedSkillGap =
    getStoredJson('skillGapResult');

  const skillGapResult =
    jobInvite && storedSkillGap?.job_field !== jobInvite.jobField
      ? null
      : storedSkillGap;

  // On a job interview the field and title are the job's own. The
  // server replaces them anyway; using them here keeps the screen and
  // the model answers consistent with what is actually being asked.
  const selectedJobField =
    jobInvite?.jobField ||
    sessionStorage.getItem('selectedJobField') ||
    skillGapResult?.job_field ||
    '';

  const selectedJobFieldName =
    jobInvite?.title ||
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
    // Nothing starts until a mode is chosen.
    if (!mode) {
      return;
    }

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
          additionalSkills,
          mode,
          jobInvite?.code || null
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

        if (!newSessionId || !newQuestion) {
          // Logged for developers; the candidate sees the start failure.
          console.error('[Frontend] Start response had no session or question:', data);
          throw new Error('incomplete start response');
        }

        setSessionId(newSessionId);
        setQuestion(newQuestion);

        // Set for a job interview, from its approved question set.
        // Practice leaves it null and keeps MAX_QUESTIONS.
        if (Number.isInteger(data?.total_questions) && data.total_questions > 0) {
          setTotalQuestions(data.total_questions);
        }

        // The invite has been used. Left in place, the next interview
        // the candidate starts on their own would be filed under this
        // job and shown to its recruiter.
        sessionStorage.removeItem('jobInvite');

        // A job interview has one attempt, so a reload must come back
        // to this one. The address carries it rather than storage, so
        // opening the interview page afresh still starts a practice.
        if (jobInvite) {
          navigate(
            `/interview?resume=${encodeURIComponent(newSessionId)}`,
            { replace: true }
          );
        }

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

        if (jobInvite) {
          // One attempt per job: never retried from here. Without the
          // invite a retry would quietly start a practice interview.
          setError(userMessage(err, "We couldn't start your job interview. Please try again from My Applications.", {
            uncertain: "We couldn't confirm your job interview started. Open My Applications to continue it from there.",
          }));
          setErrorAction({ label: 'Go to My Applications', onClick: () => navigate('/applications') });
        } else {
          setError(userMessage(err, "We couldn't start your practice interview. Please try again."));
          // Nothing was under way, so starting over loses nothing.
          setErrorAction({ label: 'Start again', onClick: () => window.location.reload() });
        }

        // A refused invite (closed job, already taken) must not carry
        // over to the next interview; the join page sets it again if
        // the candidate retries.
        sessionStorage.removeItem('jobInvite');

      } finally {
        setLoading(false);
      }
    };

    // A job interview already under way. The server sends back the
    // question the candidate was on; a fresh start would be refused,
    // because the one attempt is already in use.
    const resumeInterview = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await interviewAPI.resume(resumeId);

        console.log(
          '[Frontend] Resume response:',
          data
        );

        setSessionId(data.session_id);
        setJobInvite({ title: data.job_title, company: data.company });

        if (Number.isInteger(data?.total_questions) && data.total_questions > 0) {
          setTotalQuestions(data.total_questions);
        }

        setQIndex(data.answered || 0);

        // Every answer is in; only the grading was interrupted.
        if (data.complete) {
          await finishAndShowScorecard(data.session_id);
          return;
        }

        // The reload took the candidate off the page, so it is counted
        // with this answer as switching tab would be. The question's
        // clock starts again, and the recruiter can see why.
        integrityRef.current.leftPage = 1;

        setQuestion(data?.question?.question || '');

      } catch (err) {
        console.error(
          '[Frontend] Resume interview error:',
          err
        );

        setIsFinishing(false);

        setError(userMessage(err, "We couldn't resume your interview. Please try again."));
        // A job interview picks up from the server's copy, so loading it
        // again is a supported way back in - unless the server refused.
        if (isApiError(err) && [400, 403, 404, 409].includes(err.status)) {
          setErrorAction({ label: 'Go to My Applications', onClick: () => navigate('/applications') });
        } else {
          setErrorAction({ label: 'Try again', onClick: () => window.location.reload() });
        }

      } finally {
        setLoading(false);
      }
    };

    if (resumeId) {
      resumeInterview();
    } else {
      startInterview();
    }

  // Runs once a mode is chosen; the ref keeps a re-render from
  // starting a second interview.
  }, [mode]);

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

  // Exam mode only. It starts when the question is on screen, not when
  // the page opens: it used to start at load, so the 10-20 seconds the
  // first question took to generate came out of the candidate's time.
  const questionReady = Boolean(question);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeLeft(TOTAL_TIME);
    autoSubmittedRef.current = false;

    if (!isExam || !questionReady) {
      return undefined;
    }

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

  }, [qIndex, isExam, questionReady]);

  // ==========================================================
  // FIRST-QUESTION WAIT COUNTER
  // ==========================================================

  const waitingForFirstQuestion = Boolean(mode) && loading && !question;

  useEffect(() => {
    if (!waitingForFirstQuestion) {
      setWaitSeconds(0);
      return undefined;
    }

    const id = setInterval(() => setWaitSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [waitingForFirstQuestion]);

  // ==========================================================
  // KEYBOARD FOCUS
  // ==========================================================

  // Answer box, once the question has finished typing out. Only with a
  // mouse or trackpad: on a phone, focusing it would pop the keyboard
  // up over the question before the candidate has read it.
  useEffect(() => {
    if (aiTyping || submitted || !question) return;

    const finePointer = window.matchMedia
      && window.matchMedia('(pointer: fine)').matches;

    if (finePointer && answerRef.current) {
      answerRef.current.focus({ preventScroll: true });
    }
  }, [aiTyping, submitted, question]);

  // Next button, once the answer is recorded.
  useEffect(() => {
    if (submitted && nextButtonRef.current) {
      nextButtonRef.current.focus({ preventScroll: true });
    }
  }, [submitted]);

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

    // Without the backticks, which a speech voice may read out loud.
    const text = stripBackticks(question || displayedQ || '').trim();

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
      'Microphone access is blocked. Allow the microphone for this site in your browser settings and try again, or type your answer instead.',
    'service-not-allowed':
      "Your browser didn't allow voice input. Please type your answer instead.",
    'audio-capture':
      'No microphone was found. Check that one is connected and selected, or type your answer instead.',
    network:
      "Voice input couldn't connect. Check your internet connection and try again, or type your answer instead.",
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
        "Voice input isn't supported in this browser. Try Chrome or Edge, or type your answer instead."
      );

      return;
    }

    // The API exists in more browsers than it works in: served from
    // anything other than https or localhost, Chrome accepts the call
    // and then fails silently.
    if (!window.isSecureContext) {
      setError(
        "Voice input isn't available on this connection. Please type your answer instead."
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
          'The microphone stopped working. Please type your answer instead.'
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
        "We couldn't start the microphone. Check that no other app or tab is using it and try again, or type your answer instead."
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

    // A revised practice answer: the expected answer for this question
    // is already on screen, so it is not fetched (and paid for) again.
    if (modelAnswer) {
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
        // data.error is for the log only, never the page.
        console.warn('[Frontend] Expected answer not generated:', data?.error);
        setModelAnswerError(MODEL_ANSWER_UNAVAILABLE);
      } else {
        setModelAnswer(data);
      }

    } catch (err) {
      console.error(
        '[Frontend] Expected answer error:',
        err
      );

      setModelAnswerError(userMessage(err, MODEL_ANSWER_UNAVAILABLE));

    } finally {
      setModelAnswerLoading(false);
      modelAnswerRef.current = false;
    }
  };

  // ==========================================================
  // SUBMIT ANSWER
  // ==========================================================

  // The signals for the answer being submitted, including any time
  // away that has not ended yet. Not reset here: a submit that fails
  // and is retried must still carry them.
  const integrityForAnswer = () => {
    if (!isExam) return null;
    const s = integrityRef.current;
    const awayNow = awaySinceRef.current ? Date.now() - awaySinceRef.current : 0;
    return {
      left_page_count: s.leftPage,
      away_seconds: Math.round((s.awayMs + awayNow) / 1000),
      paste_count: s.pastes,
      pasted_chars: s.pastedChars,
    };
  };

  const resetIntegrity = () => {
    integrityRef.current = { leftPage: 0, awayMs: 0, pastes: 0, pastedChars: 0 };
    awaySinceRef.current = null;
  };

  // Counted from the answer box only, and only in exam mode.
  const handleAnswerPaste = (e) => {
    if (!isExam) return;
    const pasted = e.clipboardData?.getData('text') || '';
    integrityRef.current.pastes += 1;
    integrityRef.current.pastedChars += pasted.length;
  };

  // Grades the interview and opens its scorecard. Called after the
  // last answer, and by a resumed job interview whose answers were all
  // in before the reload. Failures go to the caller.
  const finishAndShowScorecard = async (id) => {
    setIsFinishing(true);
    setFinishStep(2);

    // Finish interview and grade with AI RAG
    const finishData =
      await interviewAPI.finish(
        id
      );

    console.log(
      '[Frontend] Interview finished successfully:',
      finishData
    );

    setFinishStep(3);

    // Store session ID and result in sessionStorage as fallback
    sessionStorage.setItem('sessionId', id);
    sessionStorage.setItem('interviewResult', JSON.stringify(finishData));

    setFinishStep(4);

    // Redirect with session ID param in URL so the scorecard is permanent
    setTimeout(() => {
      notify(finishData.evaluated === false
        ? "Your interview was submitted, but it couldn't be scored."
        : 'Interview completed—your results are ready.',
        finishData.evaluated === false ? 'warning' : 'success');
      navigate(`/scorecard?session=${encodeURIComponent(id)}`);
    }, 600);
  };

  // override: the text to send instead of the answer box, used when the
  // exam clock runs out. Callers pass nothing, never a click event.
  const handleSubmit = async (override) => {
    const text = (typeof override === 'string' ? override : answer).trim();

    if (!text) {
      return;
    }

    if (!sessionId) {
      setError(
        "Your interview hasn't started yet, so this answer can't be sent. Please wait a moment and try again."
      );

      return;
    }

    // Prevent duplicate answer request. An answer whose arrival is
    // unconfirmed is never sent again until the server is checked.
    if (submittingAnswerRef.current || unconfirmedAnswer || checkingAnswer) {
      return;
    }

    const submittedIndex = qIndex;
    let answerReceived = false;

    submittingAnswerRef.current = true;

    setLoading(true);
    setError('');
    setErrorAction(null);

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
        text.length
      );

      // ======================================================
      // LAST QUESTION
      // ======================================================

      if (qIndex + 1 >= totalQuestions) {
        console.log('[Frontend] Final question reached, starting AI evaluation.');
        setIsFinishing(true);
        setFinishStep(1);

        // Submit final answer
        await interviewAPI.submitAnswer(
          sessionId,
          text,
          integrityForAnswer()
        );
        answerReceived = true;
        resetIntegrity();

        await finishAndShowScorecard(sessionId);

        return;
      }

      // ======================================================
      // NORMAL QUESTION
      // ======================================================

      const data =
        await interviewAPI.submitAnswer(
          sessionId,
          text,
          integrityForAnswer()
        );

      // Sent and stored: the next answer starts counting from zero.
      answerReceived = true;
      resetIntegrity();

      console.log(
        '[Frontend] Next question response:',
        data
      );

      const nextQuestion =
        data?.question?.question ||
        data?.question ||
        '';

      if (!nextQuestion) {
        console.error('[Frontend] Answer response had no next question:', data);
        throw new Error('missing next question');
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

      setIsFinishing(false);

      if (answerReceived) {
        // The answer is in; what failed came after it. Sending it again
        // would record it twice, so it is never re-sent from here.
        if (submittedIndex + 1 >= totalQuestions) {
          setError("Your last answer was received, but we couldn't finish scoring your interview. Please try again.");
          setErrorAction({ label: 'Try finishing again', onClick: () => retryFinish() });
        } else if (isJobInterview) {
          await checkSubmission(submittedIndex);
        } else {
          setError("Your answer was received, but the next question didn't load. This practice interview can't continue; start a new one from your home page.");
          setErrorAction({ label: 'Go to home', onClick: () => navigate('/home') });
        }
      } else if (isJobInterview && isApiError(err) && (err.uncertain || err.status >= 500)) {
        // The server may have stored it. Ask before allowing a resend.
        await checkSubmission(submittedIndex);
      } else {
        setError(userMessage(err, "We couldn't submit your answer. It's still in the box below; please try again.", {
          uncertain: "We couldn't confirm your answer was submitted. It's still in the box below; check your connection and try again.",
        }));
      }

    } finally {
      setLoading(false);
      submittingAnswerRef.current = false;
    }
  };

  // ==========================================================
  // CHECK A JOB INTERVIEW ANSWER AFTER A FAILED SUBMIT
  //
  // Asks the server how many answers it holds (the read-only resume
  // endpoint), then either moves on - the answer arrived - or allows
  // the same answer to be sent again. Never sends anything itself.
  // ==========================================================

  const checkSubmission = async (submittedIndex) => {
    setCheckingAnswer(true);
    setUnconfirmedAnswer(true);
    setError('Checking whether your answer was received…');
    setErrorAction(null);

    let data = null;
    let failure = null;
    try {
      data = await interviewAPI.resume(sessionId);
    } catch (err) {
      failure = err;
      console.error('[Frontend] Could not check the submitted answer:', err);
    }

    const outcome = submitOutcome(data, submittedIndex, failure);
    setCheckingAnswer(false);

    if (outcome === 'complete') {
      setUnconfirmedAnswer(false);
      setError('');
      setAnswer('');
      try {
        await finishAndShowScorecard(sessionId);
      } catch (finishErr) {
        console.error('[Frontend] Finish after check failed:', finishErr);
        setIsFinishing(false);
        setError("Your answers were received, but we couldn't finish scoring your interview. Please try again.");
        setErrorAction({ label: 'Try finishing again', onClick: () => retryFinish() });
      }
      return;
    }

    if (outcome === 'received') {
      setUnconfirmedAnswer(false);
      setError('');
      setQuestion(data?.question?.question || '');
      setQIndex(data.answered);
      setAnswer('');
      setSubmitted(false);
      setModelAnswer(null);
      setModelAnswerError('');
      notify('Your answer was received.');
      return;
    }

    if (outcome === 'not-received') {
      setUnconfirmedAnswer(false);
      setError("Your answer wasn't received. It's still in the box below; please submit it again.");
      return;
    }

    // Still unknown: keep the resend blocked and let them check again.
    setError("We couldn't confirm your answer was received. It's still in the box below. Check your connection, then check again before resubmitting.");
    setErrorAction({ label: 'Check again', onClick: () => checkSubmission(submittedIndex) });
  };

  // Finishing again after a failure. A stored scorecard means the first
  // attempt worked; only otherwise is grading asked for again. No answer
  // is ever re-sent.
  const retryFinish = async () => {
    setError('');
    setErrorAction(null);
    try {
      let stored = null;
      try {
        stored = await interviewAPI.getScorecard(sessionId);
      } catch (err) {
        if (!(isApiError(err) && err.status === 404)) throw err;
      }
      if (stored) {
        sessionStorage.setItem('interviewResult', JSON.stringify(stored));
        navigate(`/scorecard?session=${encodeURIComponent(sessionId)}`);
        return;
      }
      await finishAndShowScorecard(sessionId);
    } catch (err) {
      console.error('[Frontend] Retrying finish failed:', err);
      setIsFinishing(false);
      setError(userMessage(err, "We couldn't finish scoring your interview. Please try again.", {
        uncertain: "We couldn't confirm your interview was scored. Check your connection and try again.",
      }));
      setErrorAction({ label: 'Try finishing again', onClick: () => retryFinish() });
    }
  };

  // ==========================================================
  // NEXT QUESTION
  // ==========================================================

  const handleNext = () => {
    if (loading || unconfirmedAnswer || checkingAnswer) {
      return;
    }

    if (!answer.trim()) {
      return;
    }

    handleSubmit();
  };

  // ==========================================================
  // EXAM: TIME RUNS OUT
  // ==========================================================

  // The answer goes in as it stands, as in a real timed interview. An
  // empty box sends NO_ANSWER_TEXT so the interview still moves on and
  // the grader scores it as no answer. Once per question.
  useEffect(() => {
    if (!isExam || timeLeft !== 0 || autoSubmittedRef.current) return;
    if (!sessionId || loading || isFinishing) return;

    autoSubmittedRef.current = true;
    handleSubmit(answer.trim() || NO_ANSWER_TEXT);
  }, [timeLeft, isExam]);

  // Leaving the page while an exam question is on screen: switching
  // tab (visibilitychange) or switching to another window (blur). Both
  // usually fire for one tab switch, so only the change from "here" to
  // "away" counts, and the time away is added when the candidate is back.
  const examQuestionOnScreen = isExam && Boolean(sessionId) && Boolean(question) && !isFinishing;

  useEffect(() => {
    if (!examQuestionOnScreen) return undefined;

    const goneAway = () => {
      if (awaySinceRef.current) return;
      awaySinceRef.current = Date.now();
      integrityRef.current.leftPage += 1;
    };

    const cameBack = () => {
      if (!awaySinceRef.current) return;
      integrityRef.current.awayMs += Date.now() - awaySinceRef.current;
      awaySinceRef.current = null;
    };

    const onVisibility = () => (document.hidden ? goneAway() : cameBack());

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', goneAway);
    window.addEventListener('focus', cameBack);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', goneAway);
      window.removeEventListener('focus', cameBack);
    };
  }, [examQuestionOnScreen]);

  // A reload no longer loses a job interview, but it still loses the
  // answer being typed, so the browser asks before leaving.
  const jobQuestionOnScreen = Boolean(jobInvite) && examQuestionOnScreen;

  useEffect(() => {
    if (!jobQuestionOnScreen) return undefined;

    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [jobQuestionOnScreen]);

  // Submit: in practice, show the expected answer first; in an exam,
  // send the answer and move straight on.
  const submitAnswer = () => (isExam ? handleSubmit() : revealModelAnswer());

  // Practice only: back to the answer box, keeping what was written.
  const reviseAnswer = () => {
    setSubmitted(false);
  };

  // ==========================================================
  // TIMER UI
  // ==========================================================

  const timerPct =
    (timeLeft / TOTAL_TIME) * 100;

  // Three stages instead of two, so the change to red is not the first
  // warning: amber at 30 seconds, red only for the last 10.
  const timerColor =
    timeLeft > 30
      ? 'var(--accent)'
      : timeLeft > 10
        ? 'var(--warning)'
        : 'var(--danger)';

  // Colour alone tells nothing to a screen reader user or to someone
  // not looking at the corner of the screen, so the same moments are
  // also put into words. Empty the rest of the time, which announces
  // nothing.
  const timeUp = timeLeft === 0;

  const timerAnnouncement =
    timeLeft === 60
      ? 'One minute left.'
      : timeLeft === 30
        ? '30 seconds left.'
        : timeUp
          ? "Time's up. Your answer has been submitted."
          : '';

  const mins = String(
    Math.floor(timeLeft / 60)
  ).padStart(2, '0');

  const secs = String(
    timeLeft % 60
  ).padStart(2, '0');

  // ==========================================================
  // INITIAL LOADING
  // ==========================================================

  // ==========================================================
  // MODE CHOICE (before anything starts)
  // ==========================================================

  // Practice is preselected: a first, timed attempt is where people
  // freeze, and the choice is one click to change.
  if (!mode) {
    return (
      <div
        style={{ maxWidth: 820, margin: '0 auto', padding: '36px 24px 80px' }}
        className="animate-fade-in"
      >
        <StepBar current={3} />

        <h1 style={{ fontSize: 'var(--fs-xl)', fontWeight: 800, lineHeight: 'var(--lh-tight)', marginBottom: 'var(--space-2)' }}>
          How do you want to sit this interview?
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
          {selectedJobFieldName || 'Your interview'} · {MAX_QUESTIONS} questions
        </p>

        <fieldset style={{ border: 0, padding: 0, margin: '0 0 var(--space-5)' }}>
          <legend className="sr-only">Interview mode</legend>
          <div className="mode-grid">
            {Object.entries(MODES).map(([key, m]) => (
              <label
                key={key}
                className={`mode-option ${pendingMode === key ? 'mode-option--selected' : ''}`}
              >
                <span className="mode-option__head">
                  <input
                    type="radio"
                    name="interview-mode"
                    value={key}
                    checked={pendingMode === key}
                    onChange={() => setPendingMode(key)}
                  />
                  <span className="mode-option__title">{m.title}</span>
                </span>
                <span className="mode-option__summary">{m.summary}</span>
                <ul className="mode-option__points">
                  {m.points.map((p) => <li key={p}>{p}</li>)}
                </ul>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => setMode(pendingMode)}
        >
          Start {MODES[pendingMode].title.toLowerCase()} interview
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (waitingForFirstQuestion) {
    return (
      <div
        style={{
          minHeight: '65vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
        }}
        className="animate-fade-in"
      >
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Brain
            size={32}
            color="var(--accent)"
            className="animate-spin"
          />
        </div>

        <p
          style={{
            color: 'var(--text-primary)',
            fontSize: 'var(--fs-lg)',
            fontWeight: 700,
          }}
        >
          AI is preparing your interview...
        </p>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--fs-sm)',
            textAlign: 'center',
            maxWidth: 480,
            lineHeight: 1.6,
          }}
        >
          Your interview is being generated using your selected job field and skill-gap analysis.
        </p>

        {/* After 10 seconds, say that the wait is normal and how long it
            can last, so a slow AI service is not mistaken for a crash. */}
        {/* What a screen reader announces: text that changes once, at
            10 seconds, not the counter, which would be read out every
            second. */}
        <p className="sr-only" role="status">
          {waitSeconds >= 10
            ? 'Still preparing your interview. This can take up to a minute.'
            : 'Preparing your interview.'}
        </p>

        {waitSeconds >= 10 && !error && (
          <p
            aria-hidden="true"
            style={{
              color: 'var(--warning-light)',
              fontSize: 'var(--fs-sm)',
              textAlign: 'center',
              maxWidth: 480,
              lineHeight: 'var(--lh-normal)',
            }}
          >
            Still working ({waitSeconds}s). The AI service is busy right now,
            so this can take up to a minute.
          </p>
        )}

        {selectedJobFieldName && (
          <span
            style={{
              color: 'var(--accent)',
              fontSize: 'var(--fs-xs)',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
            }}
          >
            Target role: {selectedJobFieldName}
          </span>
        )}

        {error && (
          <div role="alert"
            style={{
              marginTop: 12,
              padding: '12px 18px',
              borderRadius: 12,
              background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
              color: 'var(--danger)',
              fontSize: 'var(--fs-sm)',
              maxWidth: 600,
              textAlign: 'center',
            }}
          >
            <span className="sr-only">Error: </span>{error}
            {errorAction && (
              <div style={{ marginTop: 10 }}>
                <button type="button" className="btn btn-outline" style={{ fontSize: 'var(--fs-xs)', padding: '6px 12px' }} onClick={errorAction.onClick}>
                  {errorAction.label}
                </button>
              </div>
            )}
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
        maxWidth: 820,
        margin: '0 auto',
        padding: '36px 24px 80px',
      }}
      className="animate-fade-in"
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
          marginBottom: 28,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--success)',
                boxShadow: 'none',
                animation: 'pulse 2s infinite',
              }}
            />

            <span
              style={{
                fontSize: 'var(--fs-sm)',
                color: 'var(--success)',
                fontWeight: 600,
              }}
            >
              {isExam ? 'Exam' : 'Practice'} · {selectedJobFieldName || 'Interview'}
            </span>
          </div>

          <h1
            style={{
              fontSize: 'var(--fs-xl)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
            }}
          >
            Question {qIndex + 1} of {totalQuestions}
          </h1>
        </div>

        {/* TIMER: exam mode only */}
        {isExam ? (

        <div
          role="timer"
          aria-label={`${Number(mins)} minutes ${Number(secs)} seconds left`}
          style={{
            textAlign: 'center',
          }}
        >
          <p className="sr-only" aria-live="assertive">
            {timerAnnouncement}
          </p>
          <div
            style={{
              position: 'relative',
              width: 76,
              height: 76,
            }}
          >
            <svg
              width="76"
              height="76"
              style={{
                transform: 'rotate(-90deg)',
              }}
            >
              <circle
                cx="38"
                cy="38"
                r="32"
                fill="none"
                stroke="color-mix(in srgb, var(--fg) 8%, transparent)"
                strokeWidth="4"
              />

              <circle
                cx="38"
                cy="38"
                r="32"
                fill="none"
                stroke={timerColor}
                strokeWidth="4"
                strokeLinecap="round"
                style={{
                  filter: 'none',
                  transition: 'stroke-dashoffset 0.5s ease',
                }}
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${
                  2 * Math.PI * 32 * (1 - timerPct / 100)
                }`}
              />
            </svg>

            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock
                size={13}
                color={timerColor}
              />

              <span
                aria-hidden="true"
                style={{
                  fontSize: 'var(--fs-sm)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: timerColor,
                  marginTop: 2,
                }}
              >
                {mins}:{secs}
              </span>
            </div>
          </div>
        </div>
        ) : (
          <span className="badge badge-neutral">
            <Clock size={12} aria-hidden="true" /> No timer
          </span>
        )}
      </div>

      {/* ====================================================
          PROGRESS
      ==================================================== */}

      <div
        style={{
          height: 5,
          background: 'color-mix(in srgb, var(--fg) 8%, transparent)',
          borderRadius: 3,
          marginBottom: 28,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            borderRadius: 3,
            background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
            width: `${((qIndex + 1) / totalQuestions) * 100}%`,
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: 'none',
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
          background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
          border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'flex-start',
            paddingTop: 6,
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
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 8,
                background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              }}>
                <Sparkles size={13} color="var(--accent)" />
                <span
                  style={{
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    letterSpacing: '0.02em',
                  }}
                >
                  AI Interviewer
                </span>
              </div>

              {/* LISTEN BUTTON */}
              {speechSupported && (
                <button
                  type="button"
                  onClick={toggleListenQuestion}
                  aria-pressed={speaking}
                  disabled={aiTyping || !question}
                  title={
                    speaking
                      ? 'Stop reading the question'
                      : 'Listen to the question'
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 'var(--fs-xs)',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: 12,
                    cursor: aiTyping || !question ? 'default' : 'pointer',
                    background: speaking
                      ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
                      : 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    color: speaking ? 'var(--danger)' : 'var(--accent)',
                    border: `1px solid ${
                      speaking
                        ? 'color-mix(in srgb, var(--danger) 35%, transparent)'
                        : 'color-mix(in srgb, var(--accent) 30%, transparent)'
                    }`,
                    opacity: aiTyping || !question ? 0.45 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {speaking ? (
                    <>
                      <VolumeX size={13} />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} />
                      Listen Question
                    </>
                  )}
                </button>
              )}

              {aiTyping && (
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* The typewriter effect is for the eyes only: read out
                letter by letter it would be noise. Screen readers get
                the whole question once, when it has finished typing. */}
            <p
              aria-hidden="true"
              style={{
                fontSize: 'var(--fs-base)',
                lineHeight: 1.7,
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              <CodeText text={displayedQ} />
            </p>

            <h2 className="sr-only" aria-live="polite">
              {aiTyping ? '' : `Question ${qIndex + 1}: ${stripBackticks(question)}`}
            </h2>
          </div>
        </div>
      </div>

      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (
        <div role="alert"
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 18,
          }}
        >
          <AlertCircle
            size={16}
            color="var(--danger)"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          />

          <p
            style={{
              fontSize: 'var(--fs-sm)',
              color: 'var(--danger)',
              margin: 0,
              flex: 1,
            }}
          >
            <span className="sr-only">Error: </span>{error}
          </p>

          {errorAction && (
            <button type="button" className="btn btn-outline" style={{ fontSize: 'var(--fs-xs)', padding: '6px 12px', flexShrink: 0 }}
              onClick={errorAction.onClick} disabled={checkingAnswer}>
              {errorAction.label}
            </button>
          )}
        </div>
      )}

      {/* ====================================================
          ANSWER
      ==================================================== */}

      {/* Practice, while revising: the expected answer stays in view
          above the answer box. */}
      {!submitted && !isExam && modelAnswer && (
        <ModelAnswer
          data={modelAnswer}
          loading={false}
          error=""
        />
      )}

      {!submitted ? (
        <div
          className="card"
          style={{
            marginBottom: 20,
            background: 'color-mix(in srgb, var(--bg-surface) 75%, transparent)',
            border: '1px solid color-mix(in srgb, var(--fg) 8%, transparent)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            {/* A real label, tied to the textarea. The placeholder alone
                vanished as soon as typing began and was never announced
                as the field's name. */}
            <label
              htmlFor="interview-answer"
              style={{
                fontSize: 'var(--fs-sm)',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              Your answer
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {listening && (
                <span
                  className="badge badge-red pulse-glow"
                  style={{
                    fontSize: 'var(--fs-xs)',
                  }}
                >
                  ● Recording Active
                </span>
              )}

              <span
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                }}
              >
                {answer.length} characters
              </span>
            </div>
          </div>

          {/* Exam only: shown for the moment between the clock reaching
              zero and the answer being sent, so the submit is explained
              in words instead of a red 00:00 to be guessed at. */}
          {isExam && timeUp && (
            <p
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: 'var(--fs-sm)',
                color: 'var(--warning-light)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <Clock size={14} aria-hidden="true" />
              Time's up. Submitting your answer as it stands.
            </p>
          )}

          <textarea
            id="interview-answer"
            ref={answerRef}
            className="input"
            rows={5}
            placeholder="Type your answer, or use the microphone to speak it."
            aria-describedby="interview-answer-hint"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onPaste={handleAnswerPaste}
            onKeyDown={(e) => {
              // Ctrl+Enter (Cmd+Enter on a Mac) submits. Plain Enter
              // still starts a new line, which long answers need.
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)
                  && answer.trim() && !loading) {
                e.preventDefault();
                submitAnswer();
              }
            }}
            disabled={loading}
            style={{
              resize: 'vertical',
            }}
          />

          <p
            id="interview-answer-hint"
            style={{
              fontSize: 'var(--fs-xs)',
              color: 'var(--text-muted)',
              marginTop: 'var(--space-2)',
            }}
          >
            Press Ctrl + Enter to submit.
            {isExam && ' Leaving this page and pasting text are recorded with your answer.'}
          </p>

          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 16,
            }}
          >
            {/* MICROPHONE */}

            <button
              type="button"
              className="btn"
              onClick={toggleMic}
              aria-pressed={listening}
              disabled={loading}
              style={{
                background: listening
                  ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
                  : 'color-mix(in srgb, var(--fg) 5%, transparent)',
                color: listening
                  ? 'var(--danger)'
                  : 'var(--text-primary)',
                border: `1px solid ${
                  listening
                    ? 'color-mix(in srgb, var(--danger) 40%, transparent)'
                    : 'color-mix(in srgb, var(--fg) 12%, transparent)'
                }`,
                flex: 1,
                justifyContent: 'center',
                fontSize: 'var(--fs-sm)',
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
              type="button"
              className="btn btn-primary"
              onClick={submitAnswer}
              disabled={!answer.trim() || loading}
              style={{
                flex: 2,
                justifyContent: 'center',
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
              background: 'color-mix(in srgb, var(--success) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
              borderRadius: 14,
              padding: '18px 22px',
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              marginBottom: 22,
            }}
          >
            <CheckCircle
              size={22}
              color="var(--success)"
              style={{
                flexShrink: 0,
                marginTop: 2,
              }}
            />

            <div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 'var(--fs-sm)',
                  color: 'var(--text-primary)',
                  marginBottom: 4,
                }}
              >
                Answer Recorded!
              </p>

              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: 'var(--fs-sm)',
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {answer}
              </p>
            </div>
          </div>

          {/* EXPECTED ANSWER */}
          <ModelAnswer
            data={modelAnswer}
            loading={modelAnswerLoading}
            error={modelAnswerError}
          />

          {/* REVISE (practice): rewrite the answer with the expected one
              in view. Practice scores are kept out of progress, so
              learning from it here is the point, not a shortcut. */}
          {!isExam && (
            <button
              type="button"
              className="btn btn-outline"
              onClick={reviseAnswer}
              disabled={loading || isFinishing}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 'var(--space-3)' }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Revise my answer
            </button>
          )}

          {/* NEXT */}
          <button
            type="button"
            ref={nextButtonRef}
            className="btn btn-primary"
            onClick={handleNext}
            disabled={loading || isFinishing || unconfirmedAnswer || checkingAnswer}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '14px',
              fontSize: 'var(--fs-base)',
              fontWeight: 700,
              gap: 8,
              background: qIndex + 1 >= totalQuestions
                ? 'linear-gradient(var(--accent-solid), var(--accent-solid))'
                : undefined,
              boxShadow: 'none',
            }}
          >
            {loading || isFinishing ? (
              <>
                <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
                Evaluating Interview Performance…
              </>
            ) : qIndex + 1 >= totalQuestions ? (
              <>
                <Trophy size={17} /> Complete & Evaluate Interview
              </>
            ) : (
              <>
                Next Question
                <ChevronRight size={17} />
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
          gap: 10,
          alignItems: 'flex-start',
          marginTop: 20,
          padding: '14px 18px',
          background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
          borderRadius: 12,
        }}
      >
        <Sparkles
          size={16}
          color="var(--accent)"
          style={{
            flexShrink: 0,
            marginTop: 2,
          }}
        />

        <p
          style={{
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Pro Tip: Frame your answers using the <strong style={{ color: 'var(--text-primary)' }}>STAR Method</strong> — Situation, Task, Action, and Result to score higher on reasoning and clarity.
        </p>
      </div>

      {/* ====================================================
          AI EVALUATION PROGRESS OVERLAY
      ==================================================== */}
      {isFinishing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="finishing-title"
          style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'color-mix(in srgb, var(--bg-surface) 92%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            maxWidth: 540, width: '100%',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderTop: '3px solid var(--accent)',
            borderRadius: 16, padding: '36px 32px', textAlign: 'center',
            boxShadow: '0 25px 60px color-mix(in srgb, var(--shadow-ink) 85%, transparent)',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)', border: '2px solid color-mix(in srgb, var(--accent) 40%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              animation: 'pulse 2s infinite ease-in-out',
            }}>
              <Brain size={32} color="var(--accent)" />
            </div>

            <h2 id="finishing-title" style={{ fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Analyzing Your Interview Performance
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.5, marginBottom: 28 }}>
              Gemini AI is evaluating your technical depth, question answers, and generating your personalized scorecard…
            </p>

            {/* The current stage, in words, for screen readers. The
                icons below only show it visually. */}
            <p className="sr-only" role="status">
              {`Step ${Math.min(finishStep, FINISH_STAGES.length)} of ${FINISH_STAGES.length}: `
                + (FINISH_STAGES[finishStep - 1]?.label || 'Finishing')}
            </p>

            {/* Stages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left', marginBottom: 24 }}>
              {FINISH_STAGES.map(s => {
                const done = finishStep > s.step;
                const active = finishStep === s.step;
                return (
                  <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {done ? (
                      <CheckCircle2 size={18} color="var(--success)" style={{ flexShrink: 0 }} />
                    ) : active ? (
                      <Loader2 size={18} color="var(--accent)" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid var(--border-strong)', flexShrink: 0 }} />
                    )}
                    <span style={{
                      fontSize: 'var(--fs-sm)',
                      fontWeight: active ? 600 : 400,
                      color: done ? 'var(--success)' : active ? 'var(--accent)' : 'var(--text-sub)',
                    }}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(var(--accent-solid), var(--accent-solid))',
                width: `${finishStep * 25}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>
      )}

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
