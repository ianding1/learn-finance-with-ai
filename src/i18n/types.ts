// Types shared by the locale modules in ./locales/<code>.ts. Every locale module must export a
// default object of type Locale; scripts/check.py also checks that each one defines every UI key.

/** A language code from languages.json, e.g. "en" or "zh-cn". */
export type Lang = string;

/** Text in every language of the site, keyed by language code. */
export type Localized<T = string> = Record<Lang, T>;

export type UiKey =
	| 'lessonPrefix'
	| 'lessonPlain'
	| 'lessonUnpublished'
	| 'unpublished'
	| 'paren'
	| 'forwardHint'
	| 'figure'
	| 'check'
	| 'exerciseItem'
	| 'observe'
	| 'checksTitle'
	| 'checksHelp'
	| 'copyHint'
	| 'copiedGrading'
	| 'copiedExplain'
	| 'notAnswered'
	| 'quizItem'
	| 'points'
	| 'scoreOf'
	| 'copyGrading'
	| 'quizPartJudge'
	| 'quizPartJudgeHelp'
	| 'quizPartProblems'
	| 'quizSubmit'
	| 'lessonNotStarted'
	| 'lessonInProgress'
	| 'lessonDone'
	| 'copyFeedback'
	| 'statusOk'
	| 'statusRevise'
	| 'pasteResult'
	| 'pasteHint'
	| 'saveResult'
	| 'saved'
	| 'parseFailed'
	| 'promptTitle'
	| 'promptHelp'
	| 'copy'
	| 'copied'
	| 'close'
	| 'explain'
	| 'aiNoticeTitle'
	| 'aiNotice'
	| 'reportError'
	| 'reportTitle'
	| 'reportBody'
	| 'exercisesHeading'
	| 'prevPage'
	| 'nextPage';

export type UiStrings = Record<UiKey, string>;

export interface PromptQuestion {
	id: string;
	label: string;
	/** quiz questions only; lesson questions are not scored */
	points?: number;
	question: string;
	answer: string;
	rubric: string[];
}

export interface GradingInput {
	lang: Lang;
	lessonId: string;
	lessonTitle: string;
	lessonUrl: string;
	/** lesson facts relevant to these questions only */
	context: string[];
	/** common errors relevant to these questions only */
	commonErrors: string[];
	questions: PromptQuestion[];
}

export interface ExplainInput {
	lang: Lang;
	lessonId?: string;
	lessonTitle?: string;
	pageTitle: string;
	pageUrl: string;
	section: string;
	selection: string;
	paragraph: string;
	context?: string;
}

/** Language-independent pieces that every prompt template uses. */
export interface PromptParts {
	/** the result block the AI must end its reply with, already filled in */
	resultBlock: string;
	bullets(xs: string[]): string;
	fence(s: string): string;
}

/**
 * Prompt templates of one language. Every template must contain the language's statement that the
 * course content is AI-generated (scripts/check.py checks that each template uses DISCLAIMER).
 */
export interface PromptTemplates {
	/** feedback prompt for check questions and exercises (not scored: "ok" / "revise") */
	feedback(i: GradingInput, p: PromptParts): string;
	/** scoring prompt for a quiz */
	quiz(i: GradingInput, p: PromptParts): string;
	/** explanation prompt for selected text */
	explain(i: ExplainInput, p: PromptParts): string;
}

export interface Locale {
	ui: UiStrings;
	prompts: PromptTemplates;
}
