# selfo 官网

这是 selfo 的中英文官方产品网站，同时承载 App 使用指南、支持、订阅、隐私透明度与法律资料。站点为 GitHub Pages 准备，保持零构建、零运行时 JavaScript，不依赖 Node.js、Jekyll、外部字体、CDN、Cookie、统计脚本或服务端接口。

## 网站结构

- 产品官网首页：产品定位、整理手势、核心功能、selfo Pro、隐私承诺与支持入口；
- App 使用指南：照片访问、四个主入口、卡片手势、待确认流程、快捷工具、媒体浏览与免费额度；
- 支持与常见问题；
- selfo Pro 自动续期订阅说明；
- 隐私政策与用户协议；
- 权限与个人信息清单；
- 第三方与系统服务清单；
- DGCharts 开源声明与完整 Apache License 2.0 文本；
- 每个页面均有简体中文与 English 稳定路径。

公开联系邮箱：`yeertesi636@gmail.com`

页面内容按 selfo 1.0 当前实现整理。营销页面只使用 selfo 品牌；法定主体信息仅在中国大陆规则或合同识别确有必要的位置做最小披露，不在普通导航、支持页与全局页脚重复展示。

> 本站内容不构成律师意见。正式商用前应由熟悉中国大陆和美国相关法律的专业人士复核。

## GitHub 仓库与官网地址

官网发布仓库：

```text
CharlesYerts/charlesyerts.github.io
```

正式站点地址：

```text
https://charlesyerts.github.io/
```

当前本地文件夹仍名为 `selfo-legal-site`，不影响发布。站内链接和资源全部使用相对路径，已适配 GitHub Pages 根站点。

## 发布到 GitHub Pages

1. 新建公开用户站点仓库 `charlesyerts.github.io`，不要自动生成 README 或其他文件。
2. 将本文件夹中的全部内容提交到仓库 `main` 分支。
3. 打开 **Settings → Pages**。
4. 在 **Build and deployment** 中选择：
   - Source：`Deploy from a branch`
   - Branch：`main`
   - Folder：`/(root)`
5. 保存并等待 GitHub Pages 发布。
6. 用桌面和手机分别检查首页以及下面列出的深层链接。

GitHub Pages 首次发布或更新可能需要数分钟。根目录中的 `.nojekyll` 会让 GitHub 原样发布 HTML/CSS。

## 发布后需要验证的 URL

当前正式地址：

| 用途 | 简体中文 | English |
| --- | --- | --- |
| 官网首页 | `https://charlesyerts.github.io/` | `https://charlesyerts.github.io/en/` |
| App 使用指南 | `https://charlesyerts.github.io/guide/` | `https://charlesyerts.github.io/en/guide/` |
| 支持与 FAQ | `https://charlesyerts.github.io/support/` | `https://charlesyerts.github.io/en/support/` |
| selfo Pro | `https://charlesyerts.github.io/subscription/` | `https://charlesyerts.github.io/en/subscription/` |
| 隐私政策 | `https://charlesyerts.github.io/privacy/` | `https://charlesyerts.github.io/en/privacy/` |
| 用户协议 | `https://charlesyerts.github.io/terms/` | `https://charlesyerts.github.io/en/terms/` |
| 权限清单 | `https://charlesyerts.github.io/permissions/` | `https://charlesyerts.github.io/en/permissions/` |
| 第三方服务 | `https://charlesyerts.github.io/third-parties/` | `https://charlesyerts.github.io/en/third-parties/` |
| 开源许可 | `https://charlesyerts.github.io/open-source/` | `https://charlesyerts.github.io/en/open-source/` |

## 发布后接入 selfo

公开 URL 确认可访问后，再同步以下位置：

1. **App Store Connect**
   - Marketing URL：官网首页；
   - Privacy Policy URL：对应语言的 `/privacy/`；
   - Support URL：对应语言的 `/support/`；
   - 自动续期订阅或相关元数据中的 Terms：对应语言的 `/terms/`。
2. **Xcode 本地 StoreKit 配置**
   - 为中英文 locale 填写公开 `policyURL` 和可见名称；
   - 如不提交自定义 EULA，继续采用 Apple Standard EULA，并保留 Terms 中的说明。
3. **App 内链接**
   - 将当前失效的私有 GitHub 地址替换为官网支持页；
   - 保留 App 内原生法律正文，并可增加“查看网页版”；
   - 付费墙中的隐私政策和用户协议必须继续可用。
4. **App Store 正式下载按钮**
   - 官网已经使用“在 App Store 下载 / Download on the App Store”的正式发布文案；
   - 当前仓库内没有已确认的 App Store 产品 URL。正式发布前，把两个首页共四处 `app-store-label` 替换为指向真实产品页的链接。

## 首次提交前的隐私设置

公开 GitHub 仓库会暴露源文件与 Git 历史。首次提交前建议：

- 在 GitHub 开启 Keep my email addresses private；
- 使用 GitHub 提供的 `noreply` 提交邮箱；
- Git 提交显示名使用 `selfo` 或其他品牌化名称；
- 开启阻止暴露私人邮箱的命令行 push 保护；
- 不把家庭住址、身份证件、Apple ID 或其他不必要的私人信息提交到仓库。

## 正式发布前仍需人工确认

- **经营主体状态与地址：**持续订阅是否要求市场主体登记、是否适用免登记情形，以及需要公开何种实际经营或送达地址，必须结合真实情况确认。当前没有提供可公开地址，页面未编造。中国大陆规则可能要求官网首页持续、显著公示真实名称与标记；当前首页仅按最小范围保留一行。
- **App Store 个人账号展示：**个人 Apple Developer 账号的 Seller / Developer Name 可能直接显示法定姓名，官网无法改变；只有真实法律实体并将会员转换为组织后，才可能由实体名称承担展示。
- **中国大陆跨境处理：**GitHub Pages 会记录访问 IP，Gmail 会处理支持邮件，Apple Maps / MapKit 在中国还可能涉及高德地图。政策披露本身不等于完成可能需要的单独同意、个人信息保护影响评估或其他程序。
- **首次授权流程：**结合当前 App 的照片授权和地点展示时机，确认是否需要额外告知或单独同意。
- **重点条款提示：**自动续期、免责与责任限制仍需在 App 购买页和必要的 App 内界面显著提示，网站不能替代 Apple 购买确认。
- **易变化事实：**每次发布新版本或修改 App Store Connect 时，重新确认版本、试用状态、订阅周期、20 张照片 / 10 个视频免费额度、工具清单与第三方组件。
- **中国大陆可访问性：**发布后使用真实中国大陆网络检查首页、隐私、协议和支持链接；GitHub Pages 的境内可访问性可能波动。

## 日常维护规则

- 功能、SDK、服务器、账号、订阅或数据处理变化时，发布 App 前先更新官网相关页面。
- 每次更新同时修改中英文对应页面、事实描述与页面日期。
- 不在 GitHub Pages 中加入登录、付款、媒体上传或敏感信息收集表单。
- 不宣传“自动清理”“完全离线”或其他与当前实现不符的能力。
- 发布后如果重命名仓库、更换 GitHub 账号或未来绑定域名，要同步更新 App 与 App Store Connect URL。

## 本地预览

为了模拟 GitHub Pages 的仓库子路径，在本文件夹的父目录启动静态服务器，然后访问：

```text
http://127.0.0.1:4173/selfo-legal-site/
```

直接双击 HTML 也能浏览，但通过本地服务器预览更接近正式发布行为。
