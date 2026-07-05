# DaFen Radio

>  基于 lx-music 音源的桌面音乐播放器

---

## ✨ 功能特性

###   液态玻璃界面
采用毛玻璃设计语言，光影流动，视觉沉浸。

![](https://p.sda1.dev/33/604378be2c04510c214f0a08a3875cd4/image.png)

###   黑胶唱片 / 粒子封面
- 模拟真实黑胶唱片机效果，含唱针动画
- 专辑封面以粒子形态呈现，支持 3D 拖拽旋转
- 多档画质切换，适配不同机型功耗

![](https://p.sda1.dev/33/b0b1ec7357006b107797073194b294ca/image.png)

###   歌词滚动
支持双语歌词 + 自动滚动，活跃行 3D 弹出效果。

###   全屏模式
沉浸式全屏播放体验，尽享音乐。

![](https://p.sda1.dev/33/1523a1c5599232b955874d6f153aa6a5/image.png)

###   其他功能
- ✅ 收藏管理（本地持久化）
- ✅ 播放队列管理
- ✅ LX 音源支持（本地文件 / 在线链接）
- ✅ 窗口状态记忆
- ✅ 快捷键支持

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
https://raw.githubusercontent.com/pdone/lx-music-source/main/lx/latest.js
```

---

##  ️ 快捷键

| 按键 | 功能 |
|:---:|:---:|
| `空格` | 播放 / 暂停 |
| `ESC` | 退出全屏 |

---

##   更新日志

详见 [Releases](https://github.com/hhhjjddss/dafen-radio-LX-/releases)

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

---

##  许可证

MIT License © DaFen
