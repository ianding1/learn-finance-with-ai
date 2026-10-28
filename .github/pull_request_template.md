## 改动说明 / Summary



## 检查清单 / Checklist

- [ ] 中文原稿和英文译文在同一个 PR 中更新，并运行了 `npm run i18n:lock`。
      The Chinese source and the English translation are updated in this PR, and `npm run i18n:lock` was run.
- [ ] 课程编号、小节、图、题目的引用都使用 `<Ref>` 或 `[[...]]`，没有手写编号。
      All references use `<Ref>` or `[[...]]`, not plain numbers.
- [ ] 新概念已加入 `course/concepts.yaml`，并在课件中用 `<Def>` 标出定义处。
      New concepts are in `course/concepts.yaml` and marked with `<Def>` where they are defined.
- [ ] 新的计算题在 `course/verify/` 中有验算代码，`expected` 与答案文字一致。
      New calculation questions are verified in `course/verify/`, and `expected` matches the answer text.
- [ ] `python3 scripts/check.py` 和 `npm run build` 都通过。
      `python3 scripts/check.py` and `npm run build` pass.
