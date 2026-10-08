# DaFen Radio

[![GitHub Release](https://img.shields.io/github/v/release/hhhjjddss/dafen-radio-LX-?style=flat-square)](https://github.com/hhhjjddss/dafen-radio-LX-/releases/latest)
[![GitHub Downloads](https://img.shields.io/github/downloads/hhhjjddss/dafen-radio-LX-/total?style=flat-square&color=blue)](https://github.com/hhhjjddss/dafen-radio-LX-/releases)

>  基于 lx-music 音源的桌面音乐播放器

---

## ✨ 功能特性

###   液态玻璃界面
采用液态玻璃设计语言，光影流动，视觉沉浸。

![](https://p.sda1.dev/35/ece48dcee21d7ba857d69e13bfbb8493/image.png)

###   黑胶唱片 / 粒子封面
- 模拟真实黑胶唱片机效果，含唱针动画
- 专辑封面以粒子形态呈现，支持 3D 拖拽旋转
- 多档画质切换，适配不同机型功耗

![](https://p.sda1.dev/35/fa36fd03c2b0d9b0db6898a3e553f994/image.png)

###   歌词滚动
支持双语歌词 + 自动滚动，活跃行 3D 弹出效果。

![](https://p.sda1.dev/35/dd90092152407bb1ba30dd7b6f36cbba/image.png)

###   全屏模式
沉浸式全屏播放体验，尽享音乐。

![](https://p.sda1.dev/35/876885486171faf495213ca0a7f65fe3/image.png)

###   其他功能
- ✅ 收藏管理（本地持久化）
- ✅ 播放队列管理
- ✅ LX 音源支持（本地文件 / 在线链接）
- ✅ 窗口状态记忆
- ✅ 快捷键支持
- ✅ 歌单功能
- ✅ 主题切换

---

##   下载安装

### 方式一：下载安装包（推荐）

**[👉 点击前往 Releases 页面下载最新版本](https://github.com/hhhjjddss/dafen-radio-LX-/releases)**

### 方式二：自行构建

```bash
# 克隆项目
git clone https://github.com/hhhjjddss/dafen-radio-LX-.git
cd dafen-radio-LX-

# 安装依赖
npm install

# 启动开发版
npm run dev

# 打包成 exe 安装程序
npm run build:win
```

**环境要求**：Node.js 18+

---

##   导入音源

首次使用需要导入音源才能播放音乐：

1. 点击右上角 **设置** 按钮
2. 在「音源管理」中选择导入方式：
   - **本地文件**：选择 `.js` 音源文件
   - **在线链接**：粘贴音源 URL
3. 导入后点击「使用」即可激活

**推荐音源**：
```
https://fastly.jsdelivr.net/gh/Huibq/keep-alive/render_api.js
```

---

##  ️ 快捷键

| 按键 | 功能 |
|:---:|:---:|
| `空格` | 播放 / 暂停 |
| `ESC` | 退出全屏 |

---

##   反馈与建议

欢迎用户反馈：

- 提交 Issue 报告问题
- 分享使用体验
- 提出功能建议

您的反馈将帮助 DaFen Radio 不断完善！

---

## ⚖️ 免责声明

- 本应用仅供学习交流使用，请勿用于商业用途
- 音源由第三方提供，本应用不托管任何音乐资源
- 音乐版权归原作者/公司所有
- 原生的LX播放器地址：[LX-music-desktop](https://github.com/lyswhut/lx-music-desktop)

---

##  许可证

MIT License © DaFen
