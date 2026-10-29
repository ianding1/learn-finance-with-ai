# 跟 AI 学金融

网站：https://ianding1.github.io/learn-finance-with-ai/ · [English](README.md)

一门由 AI 编写的经济学与金融课程，以美国市场为背景。这门课教你：

1. 用经济学的方法分析企业和市场：竞争、激励和信息不对称如何影响价格与利润。
2. 解释利率、通胀、经济周期和货币政策如何影响各类资产的价格。
3. 读懂财务报表，为债券和股票估值。
4. 解释为什么分散化有效、为什么风险与预期收益相关，以及为什么多数主动管理的基金跑不赢指数。
5. 了解为美国家庭建立投资组合所需的知识，包括账户与税务、资产配置和退休提款。

网站是纯静态的，不调用任何 AI。批改和讲解时，网站生成提示词，学习者把它粘贴到自己的 AI 助手里。

> **重要说明**：所有课件、题目和参考答案都由 AI 生成，未经专业人员审核，无法保证正确。内容仅用于学习，不构成投资建议。

## 参与贡献

欢迎贡献，特别是：

- **勘误**：发现错误请[提交 issue](https://github.com/ianding1/learn-finance-with-ai/issues/new?labels=content-error)（每个页面底部都有“报告本页的错误”链接），或者直接提交修改的 pull request。
- **新语言**：见下文“增加一种语言”。

所有语言的地位相同。修改了某个页面或文本字段的一种语言版本后，`npm run check` 会列出还需要做相同修改的其他语言。如果你只能修改其中一部分，也请提交 pull request，并说明缺少哪些语言。

内容的一致性由两层检查保证：

1. `scripts/check.py`（必须通过才能合并）：各语言版本齐全且同步、引用目标存在、概念顺序、题目与答案对应、数值验算、互动图参数等。
2. AI 审查（只提供建议）：按 `.github/review-rules.md` 检查脚本无法判断的问题。

编写和发布课程的流程见 [CLAUDE.md](CLAUDE.md)（英文）。

## 开发

需要 Node.js 20.3 或更高版本，以及安装了 PyYAML 的 Python 3。

```bash
npm install
npm run dev          # 本地预览 http://localhost:4321/learn-finance-with-ai/
npm run build        # 生产构建
npm run check        # 一致性检查（python3 scripts/check.py）
npm run i18n:lock    # 记录所有语言版本已经同步（见下文）
```

| 路径 | 内容 |
| --- | --- |
| `src/i18n/languages.json` | 网站的语言列表 |
| `src/i18n/locales/<code>.ts` | 一种语言的界面文字和提示词模板 |
| `src/content/docs/<code>/` | 一种语言的页面 |
| `course/` | 课程大纲、概念、答案、数值验算和互动图设置（包含各语言的文字） |
| `src/components/`、`src/scripts/` | 组件、互动图和浏览器端代码 |
| `scripts/check.py` | CI 运行的一致性检查 |

### 翻译锁

`course/translation-lock.json` 记录每个页面和文本字段在各语言版本最近一次同步时的哈希值。如果某一项的一部分语言版本改了、另一部分没改，`npm run check` 会报错，并列出需要更新的语言。所有版本的内容重新一致后，运行 `npm run i18n:lock`。

### 增加一种语言

1. 在 `src/i18n/languages.json` 中加入这种语言（`code` 用于文件夹名、网址和 YAML 字段名；`lang` 是 BCP-47 语言标签，例如 `zh-TW`）。
2. 把 `src/i18n/locales/en.ts` 复制为 `src/i18n/locales/<code>.ts` 并翻译。
3. 在 `src/content/docs/<code>/` 下添加页面，文件名与其他语言相同。
4. 在 `course/curriculum.yaml`、`course/concepts.yaml`、`course/keys/*.yaml` 以及 `src/components/widgets/` 的标签表中，在已有语言旁边加上 `<code>:` 条目。
5. 运行 `npm run check`（会列出所有还缺少的内容），然后运行 `npm run i18n:lock`。

## 许可

- 代码：MIT（见 [LICENSE](LICENSE)）
- 课程内容（`course/` 与 `src/content/`）：CC BY-NC-SA 4.0（见 [LICENSE-CONTENT.md](LICENSE-CONTENT.md)）
