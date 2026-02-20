# 豆包即梦 Seedance 2 Prompt Studio

面向新手的 Seedance 2 提示词可视化工作台，完全免费使用。

## 功能
- 极简模式：6 个字段快速生成提示词
- 进阶模式：分时段编辑画面/动作/运镜/音频
- 模板预置：短剧片段、产品广告、科普动画
- 规则校验：素材超限、引用模糊、镜头冲突、用途缺失
- 导出能力：复制提示词、下载 TXT、导出 JSON
- 本地保存：自动保存编辑状态（localStorage）
- 捐赠可配置：支持平台选择与链接本地保存（填入即生效）
- API 进阶功能：显式配置面板（OpenAI兼容），支持 AI 增强生成
- API 安全免责声明：默认仅本地使用，不上传本项目服务器

## 本地运行
```bash
npm install
npm run dev
```

## 构建
```bash
npm run build
```

## Vercel 部署
1. 将本目录推送到 GitHub 仓库。
2. 在 Vercel 导入仓库。
3. Framework 选择 `Vite`（通常会自动识别）。
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. 点击 Deploy。

## 后续扩展建议
- 引入你在 `seedance 2/own/Style SKILL.md` 的“画风转换高级模块”
- 新增模板市场与社区分享
