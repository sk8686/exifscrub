# 背景：EXIF Scrub

浏览器端移除照片 EXIF（GPS、相机信息、时间戳）。

## 要点

- 100% 本地处理，文件不上传，无云端
- 支持 JPEG / HEIC 等（heic2any 转码、exifr 读元数据、JSZip 打包下载）
- 卖点就是隐私：不注册、不收集

## 工程

Astro + React + Tailwind，线上 exifscrub.com（Cloudflare Pages 项目 `exifscrub`）。
