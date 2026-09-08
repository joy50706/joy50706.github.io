# CV 自动编译与网站发布

修改 `CV_JX.tex` 后提交到 main，GitHub Actions 会编译 PDF 并发布整个网站。

```bash
git pull
# 编辑 CV_JX.tex
git add CV_JX.tex
git commit -m "Update CV"
git push
```

网站 CV 地址保持为 https://joy50706.github.io/CV_JX.pdf 。
生成的 PDF 在发布时覆盖网站中的旧版本，不会自动提交回 Git 仓库。
本地仓库中的 CV_JX.pdf 是快照，最新在线版本以网站为准。

在仓库 Actions 中打开 “Build website and LaTeX CV” 查看编译状态。
只有编译和网站构建全部成功，才会发布；失败时保留线上已有版本。
也可在 Actions 中手动选择 Run workflow。

本地编译（安装 TeX Live / MacTeX 和 latexmk 后）：

```bash
mkdir -p /tmp/jing-xu-cv
latexmk -pdf -interaction=nonstopmode -halt-on-error -file-line-error -outdir=/tmp/jing-xu-cv CV_JX.tex
```

PDF 在 `/tmp/jing-xu-cv/CV_JX.pdf`。
GitHub Pages 的发布来源应设置为 GitHub Actions。
