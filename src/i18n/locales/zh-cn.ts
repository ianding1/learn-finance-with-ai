// Simplified Chinese UI strings and prompt templates.
import type { Locale } from '../types';

const COURSE = '「跟 AI 学金融」';
const DISCLAIMER = '本课程的课件、题目和参考答案都由 AI 生成，未经专业人员审核，可能有错误。';

const locale: Locale = {
	ui: {
		lessonPrefix: '第 {id} 课',
		lessonPlain: '第 {id} 课《{title}》',
		lessonUnpublished: '第 {id} 课，尚未发布',
		unpublished: '尚未发布',
		paren: '（{text}）',
		forwardHint: '后续课程的内容，现在不需要掌握。',
		figure: '图 {id}',
		check: '随堂题 {id}',
		exerciseItem: '第 {n} 题',
		observe: '请观察：',
		checksTitle: '提交随堂题',
		checksHelp: '本课的随堂题在这里一起提交。',
		copyHint: '把提示词粘贴到你的 AI 助手里，再附上答案的照片，或者直接把答案写在提示词后面。可以一次提交全部答案，也可以分几次提交。',
		copiedGrading: '已复制，粘贴到 AI 助手即可',
		copiedExplain: '已复制讲解提示词',
		notAnswered: '未作答',
		quizItem: '第 {n} 题',
		points: '{n} 分',
		scoreOf: '{s}/{m} 分',
		copyGrading: '复制评分提示词',
		quizPartJudge: '一、判断题',
		quizPartJudgeHelp: '判断“真”或“假”，并说明理由。只写判断、没有理由的不得分。',
		quizPartProblems: '二、计算与分析',
		quizSubmit: '提交测验',
		lessonNotStarted: '未开始',
		lessonInProgress: '学习中',
		lessonDone: '已完成',
		copyFeedback: '复制批改提示词',
		statusOk: '通过',
		statusRevise: '需要订正',
		pasteResult: '粘贴 AI 返回的结果',
		pasteHint: '把 AI 回答末尾 <<<LFWAI-RESULT 到 LFWAI-RESULT>>> 之间的内容（或整个回答）粘贴到这里。',
		saveResult: '保存结果',
		saved: '已保存。',
		parseFailed: '没有找到可以识别的结果块。请确认粘贴了 AI 回答中 <<<LFWAI-RESULT 开头的部分。',
		promptTitle: '复制下面的提示词',
		promptHelp: '没有自动复制成功，请手动选中下面的全部内容并复制。',
		copy: '复制',
		copied: '已复制',
		close: '关闭',
		explain: '展开讲解',
		aiNoticeTitle: '本站内容由 AI 生成，可能有错误，不构成投资建议。',
		aiNotice: '本站所有课件、题目和参考答案都由 AI 生成，未经专业人员审核，无法保证正确。如果发现错误，请通过页面底部的链接报告。内容仅用于学习，不构成投资建议。',
		reportError: '报告本页的错误',
		reportTitle: '[内容错误] {page}',
		reportBody: '页面：{url}\n\n错误位置（复制原文）：\n\n问题说明：\n',
		exercisesHeading: '练习题',
		prevPage: '上一页',
		nextPage: '下一页',
	},

	prompts: {
		feedback(i, p) {
			const qs = i.questions
				.map(
					(q) => `### ${q.label}（id：${q.id}）
题目：
${q.question}

参考答案：
${q.answer}

批改要点：
${p.bullets(q.rubric)}`,
				)
				.join('\n\n');
			return `你是${COURSE}课程的老师。请批改学习者在第 ${i.lessonId} 课《${i.lessonTitle}》中的作答。学习者的答案附在本提示词之后（照片或文字），可能只包含其中一部分题目。

## 重要说明
${DISCLAIMER}如果你认为参考答案或批改要点本身有误，请明确指出错在哪里，并按正确的答案批改，不要因为学习者没有照搬错误的参考答案而判错。

## 课程页面
${i.lessonUrl}
（如果你能访问网页，可以参考；不能访问也没有关系，批改需要的内容都已写在下面。）

## 与这些题目相关的课程要点
${p.bullets(i.context)}

## 题目、参考答案与批改要点
${qs}
${i.commonErrors.length ? `\n## 常见错误（供诊断参考）\n${p.bullets(i.commonErrors)}\n` : ''}
## 请这样回复
1. 这些题**不打分**。只批改学习者这次作答了的题目，没有作答的题目不要提及，它们会在以后提交。
2. 逐题指出哪里正确、哪里有错。重点检查推理和理由，不只看最终数字。
3. 对错误之处，用学习者能理解的方式讲解，必要时举一个小例子。不要只重复参考答案。
4. 如果作答反映出对某个概念的误解，明确指出是哪个概念。
5. 用中文回复，数学公式使用 LaTeX。
6. 在回复的最后，原样输出下面格式的结果块，JSON 必须合法：

${p.resultBlock}

items 中只列出这次批改了的题目，每题一项。status 填 "ok"（基本正确，只有小问题）或 "revise"（有实质错误，需要订正）。各题的 id：${i.questions.map((q) => q.id).join('、')}。

## 学习者的答案
`;
		},

		quiz(i, p) {
			const qs = i.questions
				.map(
					(q) => `### ${q.label}（id：${q.id}，${q.points} 分）
题目：
${q.question}

参考答案：
${q.answer}

评分要点：
${p.bullets(q.rubric)}`,
				)
				.join('\n\n');
			return `你是${COURSE}课程的老师。请为学习者的《${i.lessonTitle}》作答评分。学习者的答案附在本提示词之后（照片或文字），可能只包含其中一部分题目。

## 重要说明
${DISCLAIMER}如果你认为参考答案或评分要点本身有误，请明确指出错在哪里，并按正确的答案评分，不要因为学习者没有照搬错误的参考答案而扣分。

## 测验页面
${i.lessonUrl}
（如果你能访问网页，可以参考；不能访问也没有关系，评分需要的内容都已写在下面。）

## 与这些题目相关的课程要点
${p.bullets(i.context)}

## 题目、参考答案与评分要点
${qs}
${i.commonErrors.length ? `\n## 常见错误（供诊断参考）\n${p.bullets(i.commonErrors)}\n` : ''}
## 评分规则
- 只给学习者这次作答了的题目评分。没有作答的题目不评分，也不要给 0 分，它们会在以后提交。
- 按评分要点给分，可以给部分分。计算题没有过程的部分不给分；过程部分正确，按评分要点给相应的分。
- 判断题只写“真”或“假”、没有理由的，不给分。
- 题目要求给出几条理由或几个答案时，只按要求的数量、按作答顺序评分，多写的不评。

## 请这样回复
1. 逐题给出得分，并指出哪里正确、哪里有错。重点检查推理和理由，不只看最终数字。
2. 对失分之处，用学习者能理解的方式讲解，必要时举一个小例子。不要只重复参考答案。
3. 用中文回复，数学公式使用 LaTeX。
4. 在回复的最后，原样输出下面格式的结果块，JSON 必须合法：

${p.resultBlock}

items 中只列出这次评分了的题目，每题一项，score 填实际得分，max 填满分。各题的 id 与满分：${i.questions.map((q) => `${q.id}（${q.points} 分）`).join('、')}。

## 学习者的答案
`;
		},

		explain(i, p) {
			const where = i.lessonId ? `第 ${i.lessonId} 课《${i.lessonTitle}》` : `《${i.pageTitle}》页面`;
			const parts = [
				`我在学习${COURSE}课程的${where}，有一段内容没有看懂，请帮我展开讲解。
说明：${DISCLAIMER}如果你发现这段内容本身有误，请直接指出。

页面：${i.pageUrl}
所在小节：${i.section || '（无）'}

我选中的文字：
${p.fence(i.selection)}`,
			];
			if (i.paragraph.trim() !== i.selection.trim()) parts.push(`它所在的段落：\n${p.fence(i.paragraph)}`);
			if (i.context) parts.push(`本课要点（供你了解上下文）：\n${i.context}`);
			parts.push(`请这样讲解：
1. 先用一两句话说明这段话的意思。
2. 再解释为什么是这样，补上中间省略的步骤；如果涉及公式，说明每个符号的含义。
3. 举一个具体的小例子，最好用数字。
4. 如果这段话依赖前面学过的概念，简单提醒一下。除非理解这段话必须用到，不要提前讲后续课程的内容。
5. 最后出一道很短的小问题，让我检验自己是否理解了（先不要给出答案）。
用中文回答，数学公式使用 LaTeX。`);
			return parts.join('\n\n') + '\n';
		},
	},
};

export default locale;
