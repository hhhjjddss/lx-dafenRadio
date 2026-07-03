# DaFen Radio

>  Beta 测试版 · 基于 lx-music 音源的音乐播放器

---

## ✨ 功能展示

###   液态玻璃界面/黑胶唱片3D/音源管理/主题切换
采用毛玻璃设计语言，光影流动，视觉沉浸。

[![pmwfG36.png](https://s41.ax1x.com/2026/07/03/pmwfG36.png)

![](https://p.sda1.dev/33/604378be2c04510c214f0a08a3875cd4/image.png)

###   粒子封面/歌词滚动/收藏管理
专辑封面以粒子形态呈现，考虑到机型功耗原因,支持多档画质切换。



![](https://p.sda1.dev/33/b0b1ec7357006b107797073194b294ca/image.png)

###   全屏模式
沉浸式全屏播放体验，尽享音乐。

![dd](https://p.sda1.dev/33/1523a1c5599232b955874d6f153aa6a5/image.png)

---

##   关于本项目

**DaFen Radio** 是一款完全基于 [lx-music](https://github.com/lyswhut/lx-music-desktop) 音源协议开发的桌面音乐播放器。

开发灵感来源于 **MineRadio**，进行了全新的 UI 设计与功能优化。

⚠️ **当前版本：Beta 测试版**
本应用仍处于内测阶段，可能存在不完善之处，欢迎用户体验并提出宝贵的升级建议！提供了exe安装包,无需拉取项目!后期会开源所有代码!

---

##   Beta版本安装程序:

[v1.0.0 Beta 测试版](https://github.com/hhhjjddss/dafen-radio-LX-/tree/main)

### 快速开始



### 环境要求
- Node.js 18+
- npm 或 pnpm

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发版
npm run dev
```

### 打包发布

```bash
# 生成安装程序（.exe）
npm run build:win

# 生成便携版（文件夹）
npm run build:unpack
```

---

##   导入音源

首次使用需要导入音源才能播放音乐：

1. 点击右上角 **设置** 按钮
2. 在「音源管理」中选择导入方式：
   - **本地文件**：选择 `.js` 音源文件
   - **在线链接**：粘贴音源 URL
3. 导入后点击「使用」即可激活

音源获取方式：GitHub 搜索 `lx-music-source`,或者

```
https://raw.githubusercontent.com/pdone/lx-music-source/main/lx/latest.js
```

项目基于lx开发,但仍可尝试其他来源音源,可发聩开发者基于宝贵建议

---

##  ️ 快捷键

| 按键 | 功能 |
|:---:|:---:|
| `空格` | 播放 / 暂停 |
| `ESC` | 退出全屏 |

---

##  反馈与建议

本项目处于 Beta 测试阶段，非常欢迎用户反馈：

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
