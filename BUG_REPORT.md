# 深度BUG扫描报告 - EXIF Remover 网站

> **扫描时间**: 2026-06-15
> **扫描范围**: 全部源文件（src/* + public/* + 配置）
> **文件数**: 30+
> **测试方法**: 静态代码审计 + 跨文件逻辑流分析 + 边界条件推演 + 实际功能流推演

---

## 严重程度分级

| 等级 | 标识 | 说明 |
|------|------|------|
| **P0** | 🔴 致命 | 用户完全无法使用核心功能 / 数据丢失 / 安全漏洞 |
| **P1** | 🟠 严重 | 核心功能受影响 / 关键UI损坏 / 业务逻辑错误 |
| **P2** | 🟡 中等 | 功能异常但有workaround / 体验下降 |
| **P3** | 🔵 轻微 | 视觉小问题 / 文案 / 边缘情况 |

---

# 第一部分：致命严重BUG（P0 / P1）

## 🔴 P0-01: 清除超大图片导致浏览器崩溃/卡死（潜在）
**风险等级**: 🔴 P0（极端情况下）
**位置**: [exif-cleaner.ts:41-79](file:///d:/去除图片元数据/src/lib/exif-cleaner.ts#L41-L79)
**问题描述**:
- `removeExifViaCanvas` 直接使用 `img.naturalWidth × naturalHeight` 创建canvas
- 5000万像素的图片（常见RAW手机）会创建 5000万×3000万 像素的canvas
- 浏览器对canvas的内存限制是 ~268MB，超大图片直接 OOM 崩溃
- **没有任何大小限制或降级处理**

**复现操作**:
1. 准备一张 8000×6000 的大图（普通iPhone照片）
2. 上传清理
3. 浏览器页面白屏或 tab 崩溃

**修复方案**:
```typescript
// 限制最大尺寸，长边超过4096则等比缩放
const MAX_DIM = 4096;
let { width, height } = img;
if (width > MAX_DIM || height > MAX_DIM) {
  const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
  width = Math.round(width * ratio);
  height = Math.round(height * ratio);
}
canvas.width = width;
canvas.height = height;
```

---

## 🔴 P0-02: 全局 paste 监听器会导致任何页面输入框/可编辑区域的粘贴图片被截获
**风险等级**: 🔴 P0（隐私 + 体验灾难）
**位置**: [DropZone.tsx:88-92](file:///d:/去除图片元数据/src/components/DropZone.tsx#L88-L92)
**问题描述**:
- `document.addEventListener('paste', handlePaste)` 在整个 document 上监听
- 用户在文章搜索框、404页面、未来任何输入框粘贴图片都会被截获上传
- 用户在浏览其它标签页时，复制图片后回到本标签页也会被误触发
- 破坏"只在DropZone区域粘贴"的预期行为

**复现操作**:
1. 打开首页
2. 在任何地方按 Ctrl+V 粘贴图片
3. 即使没有聚焦DropZone，图片也会被上传

**修复方案**:
- 改为 DropZone 自身 `onPaste` 监听
- 或在 handlePaste 中检查 `e.target` 是否在 DropZone 内
- 或检查 `document.activeElement` 是否为非可编辑元素

---

## 🔴 P0-03: 内存泄漏 - 照片缩略图 ObjectURL 永久不释放
**风险等级**: 🔴 P0（长会话下内存耗尽）
**位置**: [ExifRemover.tsx:45-65](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L45-L65), [ExifRemover.tsx:91-112](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L91-L112)
**问题描述**:
- `URL.createObjectURL(file)` 在 handleFilesSelected 中创建
- 仅在 handleRemove 中调用 `URL.revokeObjectURL`
- 用户在 5 分钟内上传/删除 100 张照片，每次都泄漏 ~MB 级内存
- 自动清理（5分钟）将 cleanedFile 设为 null，但 thumbnail 永远不释放
- **页面关闭前不主动 revoke**

**复现操作**:
1. 上传 50 张大图
2. 删除 50 张
3. DevTools Memory profiler 显示 ObjectURL 仍在内存中

**修复方案**:
```typescript
// 清理时同时revoke thumbnail
const handleRemove = useCallback((id: string) => {
  const photo = photosRef.current.find((p) => p.id === id);
  if (photo) {
    URL.revokeObjectURL(photo.thumbnail);
    if (photo.cleanedFile) URL.revokeObjectURL(/* 需要存储cleaned blob URL */);
  }
  // ...
}, []);

// 组件卸载时清理
useEffect(() => {
  return () => {
    photosRef.current.forEach(p => {
      URL.revokeObjectURL(p.thumbnail);
    });
  };
}, []);
```

---

## 🟠 P1-01: 已清理照片的 thumbnail 也是原始的，可能仍含隐私信息
**风险等级**: 🟠 P1（隐私隐患）
**位置**: [ExifRemover.tsx:49](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L49)
**问题描述**:
- `thumbnail: URL.createObjectURL(file)` 用的是原始 file
- PhotoGrid 渲染的 `<img src={photo.thumbnail}>` 是原图缩略图
- 用户清理完照片后，缩略图区域仍展示原图（虽然小但仍可能暴露 GPS 的视觉位置）
- 此外，ObjectURL 引用的是原始 File 对象，理论上仍可在 DevTools 中访问

**修复方案**:
- 清理完成后，thumbnail 也应切换为 cleanedFile 的 ObjectURL
- 或在清理后将 thumbnail 替换为 cleanedFile 的 URL

---

## 🟠 P1-02: 重复点击 Clean All 按钮会导致并发清理
**风险等级**: 🟠 P1（逻辑漏洞）
**位置**: [CleanActions.tsx:46-53](file:///d:/去除图片元数据/src/components/CleanActions.tsx#L46-L53)
**问题描述**:
- 按钮仅在 `isProcessing` 状态时 disabled
- 但是 isProcessing 是 `photos.some(p => p.isProcessing)`，即只要有一张在处理中就禁用
- handleCleanAll 是顺序 await，但 await 之间的间隙中用户可能再次点击（如果第一次处理非常快）
- 更严重：用户连点 N 次会启动 N 个并发循环
- 结果：同一张照片被处理多次，浪费资源，状态混乱

**修复方案**:
```typescript
// ExifRemover 中加 in-flight flag
const cleanAllInFlight = useRef(false);

const handleCleanAll = useCallback(async () => {
  if (cleanAllInFlight.current) return;
  cleanAllInFlight.current = true;
  try {
    // 业务逻辑
  } finally {
    cleanAllInFlight.current = false;
  }
}, []);
```

---

## 🟠 P1-03: 5分钟自动清理计时器可能在用户正在下载时清空文件
**风险等级**: 🟠 P1（用户数据丢失）
**位置**: [ExifRemover.tsx:28-43](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L28-L43)
**问题描述**:
- 5分钟 setTimeout 是绝对的，不考虑用户是否正在下载
- 用户上传 50 张大图，每张 30 秒处理时间，处理完就剩 4:30
- 用户分批下载，下载到一半某张照片触发自动清理，cleanedFile 变 null
- 点击 Download 按钮 → 引用 null → 崩溃或下载失败

**复现操作**:
1. 上传大图
2. 点击 Clean
3. 等待 4:59
4. 在 5:00 整点下载 → cleanedFile 已被设为 null

**修复方案**:
- 改为"上次交互后 5 分钟"而非"清理完成后 5 分钟"
- 或在用户点击 Download 时延长/重置计时
- 或至少在 setPhotos 中检查 cleanedFile 是否在 use 中

---

## 🟠 P1-04: 处理超大图时，缩略图（原始图）会卡住整个 UI 线程
**风险等级**: 🟠 P1（功能不可用）
**位置**: [ExifRemover.tsx:69-88](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L69-L88)
**问题描述**:
- `readExif` 和 `cleanFile` 都是同步阻塞主线程的
- 单张大图清理可能需要 5-30 秒，期间整个 React 组件冻结
- 进度条/取消按钮无法显示
- 用户不知道是崩溃了还是在工作

**修复方案**:
- 用 Web Worker 处理 readExif 和 cleanFile
- 或至少在 handleCleanSingle 中显示进度提示

---

# 第二部分：业务逻辑BUG

## 🟠 P1-05: 移动端 DropZone 的"信任徽章"（100% local）绝对定位与 skippedCount 提示重叠
**位置**: [DropZone.tsx:162-178](file:///d:/去除图片元数据/src/components/DropZone.tsx#L162-L178)
**问题描述**:
- `absolute bottom-4` 的信任徽章
- `absolute bottom-12` 的 skippedCount 提示
- 当两个都出现时（同一时间只有一种情况），但 skippedCount 仅在"有跳过文件"时显示
- 在移动端小屏幕上，DropZone 的 padding 不足以容纳两个 absolute 元素
- 信任徽章可能被 skippedCount 文字遮挡

**复现**:
- 上传混合支持/不支持格式的文件
- 移动端 375px 宽度查看

**修复方案**:
- 不要用 absolute，改用正常 flex 布局
- 或将 skippedCount 替换为 toast 提示

---

## 🟠 P1-06: isProcessing 状态会无限卡死 - 失败后可能不再重置
**位置**: [ExifRemover.tsx:81-87](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L81-L87), [ExifRemover.tsx:146-150](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L146-L150)
**问题描述**:
- 异常分支中设置 `isProcessing: false, error: 'Failed to read file'`
- 但如果 readExif 抛出非 Error 类型（字符串、undefined），catch 块可能异常
- 当前 catch 块没有日志，用户无法排查
- 测试覆盖率低，难以发现

**修复方案**:
```typescript
} catch (err) {
  console.error('readExif failed:', err);
  setPhotos((prev) => {
    const updated = prev.map((p) =>
      p.id === photo.id ? { 
        ...p, 
        isProcessing: false, 
        error: `Failed to read file: ${err instanceof Error ? err.message : 'Unknown error'}` 
      } : p
    );
    return updated;
  });
}
```

---

## 🟡 P2-01: HandleRemove 仍引用过期 photosRef 导致 selectId 选中不存在照片
**位置**: [ExifRemover.tsx:105-111](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L105-L111)
**问题描述**:
```typescript
setSelectedId((prev) => {
  if (prev === id) {
    const remaining = photosRef.current;
    return remaining.length > 0 ? remaining[0].id : null;
  }
  return prev;
});
```
- setSelectedId 的 updater 在执行时 photosRef.current 已被 setPhotos 之前的 setPhotos(更新) 更新了吗？不一定
- React 18 batch update 中，photosRef.current 的更新时机是 setPhotos 内部的 `photosRef.current = updated`
- 但 setSelectedId 的 setState 可能在 batch 中排在更早位置
- 结果：remaining 仍是旧值，可能选中已被删除的照片

**修复方案**:
```typescript
setSelectedId((prev) => {
  if (prev !== id) return prev;
  // 通过 functional setState 读取最新值
  // 或使用 setPhotos 中的 prev 计算新 selectedId
});
```

---

## 🟡 P2-02: RiskBadge 的 compact 模式在长文本下换行错乱
**位置**: [RiskBadge.tsx:18-24](file:///d:/去除图片元数据/src/components/RiskBadge.tsx#L18-L24)
**问题描述**:
- `px-2 py-1 rounded` 是小圆角，与非 compact 模式 `rounded-full` 视觉不一致
- 风险徽章在 MetaPanel 的 risks 列表、PhotoCard、表格中混用紧凑模式
- 截断或长内容下，emoji + 数字的组合可能溢出

**修复方案**:
- 统一使用 rounded-full
- 添加 `shrink-0` 防止被 flex 挤压

---

## 🟡 P2-03: PhotoGrid 删除按钮(✕) 缺少键盘可访问性
**位置**: [PhotoGrid.tsx:105-112](file:///d:/去除图片元数据/src/components/PhotoGrid.tsx#L105-L112)
**问题描述**:
- 按钮有 aria-label，但无视觉焦点样式（无 focus ring）
- 键盘用户无法看到当前焦点位置
- WCAG 2.4.7 违规

**修复方案**:
```tsx
className="...focus:outline-none focus:ring-2 focus:ring-white"
```

---

## 🟡 P2-04: MetaPanel 搜索框无防抖，无清除按钮
**位置**: [MetaPanel.tsx:116-122](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L116-L122)
**问题描述**:
- 用户输入"GPS"会立即过滤，但每次 onChange 都重新计算
- 长列表(500+tags)时频繁 re-render
- 输入错误后无清除按钮，需手动选中删除
- 无搜索结果统计（"找到 3 项匹配"）

**修复方案**:
- 添加 useDeferredValue/useTransition
- 添加清除按钮（X icon）
- 显示结果数量

---

## 🟡 P2-05: 搜索"GPS"时匹配了所有含 G-P-S 字符的标签，误命中
**位置**: [MetaPanel.tsx:28-34](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L28-L34)
**问题描述**:
- 搜索是简单的 includes 匹配
- 搜索"GPS"会匹配所有含 G、P、S 字符的内容
- 如"GPano"、"GPS"，"Sprint"等
- 应支持更精确的匹配或标签分类筛选

---

## 🟡 P2-06: 切换语言后 DropZone 提示文本仍是英文
**位置**: [DropZone.tsx:148](file:///d:/去除图片元数据/src/components/DropZone.tsx#L148)
**问题描述**:
- DropZone 中的格式提示硬编码为英文
- "JPG, PNG, WebP, HEIC, GIF, AVIF, TIFF — or paste from clipboard (Ctrl+V)"
- 没有 i18n
- 信任徽章文字同样硬编码

**修复方案**:
- DropZone 接受 t prop，使用 t.dropzone.hint 和 t.dropzone.trust

---

## 🟡 P2-07: Clean All 在 HEIC 文件转换失败时不显示错误原因
**位置**: [ExifRemover.tsx:154-159](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L154-L159), [exif-cleaner.ts:82-99](file:///d:/去除图片元数据/src/lib/exif-cleaner.ts#L82-L99)
**问题描述**:
- HEIC 转换失败时（heic2any 抛错），cleanFile 进入 catch
- 错误信息统一为"Failed to clean file"
- 用户不知道为什么 HEIC 失败

**修复方案**:
- 错误信息区分 HEIC/普通图片
- HEIC 失败时提示"HEIC format may not be supported in your browser"

---

## 🟡 P2-08: searchQuery 在切换照片时不清空
**位置**: [MetaPanel.tsx:12-15](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L12-L15)
**问题描述**:
- 用户在照片A搜索"GPS"
- 切换到照片B时，搜索词仍为"GPS"
- 但如果照片B没有该词，UI 显示"No metadata matching"
- 用户困惑

**修复方案**:
```typescript
useEffect(() => {
  setSearchQuery('');
  setViewMode('table');
}, [photo.id]);
```

---

## 🟡 P2-09: ContentPage 的 prev/next 导航在内容页英文版和语言版链接相同，不切换语言
**位置**: [slug.astro:62-83](file:///d:/去除图片元数据/src/pages/%5Bslug%5D.astro#L62-L83), [[lang]/[slug].astro:72-83](file:///d:/去除图片元数据/src/pages/%5Blang%5D/%5Bslug%5D.astro#L72-L83)
**问题描述**:
- 英文版 `/what-is-exif-data` 的 prev/next 跳转到 `/next-article`
- 切换到中文后，中文版的 prev/next 也跳到中文路径 `/zh/next-article`
- 这是正确的（已实现）
- **但 Article index 列表** 也是中文路径，意味着非英文用户无法访问英文版内容

---

## 🟡 P2-10: Article Schema 缺少必填字段
**位置**: [[slug].astro:115-120](file:///d:/去除图片元数据/src/pages/%5Bslug%5D.astro#L115-L120), [[lang]/[slug].astro:115-120](file:///d:/去除图片元数据/src/pages/%5Blang%5D/%5Bslug%5D.astro#L115-L120)
**问题描述**:
- Article schema 仅有 headline 和 description
- 缺少：author、datePublished、dateModified、image、publisher
- Google Search Console 可能拒绝该结构化数据

**修复方案**:
```typescript
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": doc.data.title,
  "description": doc.data.description,
  "datePublished": doc.data.publishedAt,
  "dateModified": doc.data.updatedAt,
  "author": { "@type": "Organization", "name": "EXIF Remover" }
}
```

---

## 🟡 P2-11: 404页面缺少结构化数据和 SEO 优化
**位置**: [404.astro](file:///d:/去除图片元数据/src/pages/404.astro), [[lang]/404.astro](file:///d:/去除图片元数据/src/pages/%5Blang%5D/404.astro)
**问题描述**:
- 404 页面没有 noindex meta
- 没有自定义 og:title/description
- 没有网站搜索链接（让用户能继续找内容）
- 与首页 hero 一致的布局更友好

**修复方案**:
- 添加 `<meta name="robots" content="noindex" />`
- 添加搜索建议链接

---

## 🟡 P2-12: 第三方 OpenStreetMap tile 服务器被强依赖
**位置**: [MetaPanel.tsx:212](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L212)
**问题描述**:
- `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` 直接调用 OSM
- 用户隐私宣传是"100% local processing, files never leave your device"
- 但实际上每次显示 GPS 地图，用户的 IP、坐标都会发给 OSM
- 违反隐私承诺

**修复方案**:
- 至少在地图上方提示"Map tiles loaded from OpenStreetMap"
- 或考虑自托管瓦片
- 或干脆改为显示坐标文字 + 链接到 maps.google.com（外部链接）

---

# 第三部分：UI/交互细节缺陷

## 🔵 P3-01: 移动端 Header 导航横屏溢出
**位置**: [Header.astro:28-69](file:///d:/去除图片元数据/src/components/Header.astro#L28-L69)
**问题描述**:
- 横屏（高度 < 500px）时，Header 高度增加挤压内容
- 移动端 Tool/Learn 按钮在宽度 < 380px 时可能挤在一起
- 缺少汉堡菜单（mobile menu）

**修复操作**:
- iPhone SE 320×568 横屏
- 三星 Galaxy Fold 280×653 折叠屏
- 可见导航溢出/挤压

**修复方案**:
- 添加汉堡菜单（drawer）
- 移动端仅显示 Logo + 语言切换 + 菜单按钮

---

## 🔵 P3-02: 信任徽章横屏 4 列变 2 列文字溢出
**位置**: [TrustBadges.astro:37](file:///d:/去除图片元数据/src/components/TrustBadges.astro#L37)
**问题描述**:
- `grid-cols-2 md:grid-cols-4` 在 md 以下为 2 列
- 极窄屏（< 320px）每个徽章宽 140px
- 长描述"No signup, no limits"在 140px 内换行不美观
- 无 min-width 保护

---

## 🔵 P3-03: 404 页面缺少搜索建议
**位置**: [404.astro:25-42](file:///d:/去除图片元数据/src/pages/404.astro#L25-L42)
**问题描述**:
- 仅提供"Go to Tool"和"Learn about EXIF"两个链接
- 没有热门文章推荐
- 没有搜索框
- 没有"返回上一页"按钮

**修复方案**:
- 添加 `history.back()` 链接
- 添加热门文章列表

---

## 🔵 P3-04: PhotoCard hover 删除按钮的视觉提示不明确
**位置**: [PhotoGrid.tsx:48-55](file:///d:/去除图片元数据/src/components/PhotoGrid.tsx#L48-L55)
**问题描述**:
- 之前有过 `opacity-0 group-hover:opacity-100` 的设计（hover 显示删除按钮）
- 现在改为 `absolute top-1 left-1` 始终显示 ✕
- 但没有任何"这是删除按钮"的视觉提示
- 误点击风险高，特别是移动端

**修复方案**:
- ✕ 图标加 hover 状态（红色背景）
- 长按显示确认 toast
- 删除前添加确认 dialog

---

## 🔵 P3-05: MetaPanel 的 RiskBadge 在 Before/After 视图中是"high"但实际已清理
**位置**: [MetaPanel.tsx:282](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L282)
**问题描述**:
- Before 面板使用 `tag.riskLevel`（原始标签）
- After 面板硬编码 `level="low"`
- 但用户可能疑惑：After 面板的 "GPS Latitude" 标签，应该显示"removed"而非"low"
- 视觉上："low"绿色徽章 = 风险低 = 误导

**修复方案**:
- After 面板：保留的标签显示"✓ Preserved"绿色，未保留的不显示

---

## 🔵 P3-06: DropZone 的拖拽闪烁问题
**位置**: [DropZone.tsx:46-56](file:///d:/去除图片元数据/src/components/DropZone.tsx#L46-L56)
**问题描述**:
- `handleDragLeave` 在拖拽到子元素时也会触发
- 用户在 DropZone 内拖拽到 Browse 按钮时，DropZone 会闪烁（leave→over→leave）
- 体验抖动

**修复方案**:
```typescript
const handleDragLeave = useCallback((e: DragEvent) => {
  // 检查是否真的离开（不是进入子元素）
  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
  setIsDragging(false);
}, []);
```

---

## 🔵 P3-07: FAQ 手风琴无 ARIA 语义
**位置**: [FAQ.tsx:42-67](file:///d:/去除图片元数据/src/components/FAQ.tsx#L42-L67)
**问题描述**:
- 使用 `<button>` 但缺少 `aria-expanded`、`aria-controls`
- 屏幕阅读器无法识别折叠/展开状态
- WCAG 4.1.2 违规

**修复方案**:
```tsx
<button
  aria-expanded={openIndex === i}
  aria-controls={`faq-panel-${i}`}
>
  {/* ... */}
</button>
{openIndex === i && (
  <div id={`faq-panel-${i}`} role="region">
    {/* ... */}
  </div>
)}
```

---

## 🔵 P3-08: Clean All 按钮文本在处理中缺少 spinner
**位置**: [CleanActions.tsx:50-52](file:///d:/去除图片元数据/src/components/CleanActions.tsx#L50-L52)
**问题描述**:
- 文本"Processing..."但没有 spinner 图标
- 用户不知道是否在动

**修复方案**:
- 加载状态下显示 spinner

---

## 🔵 P3-09: Download All 按钮在打包大文件时无进度提示
**位置**: [CleanActions.tsx:31-36](file:///d:/去除图片元数据/src/components/CleanActions.tsx#L31-L36)
**问题描述**:
- `await zip.generateAsync({ type: 'blob' })` 阻塞数秒
- 50 张大图可能需要 10-30 秒
- 按钮仅显示"Preparing..."文字
- 无进度条

**修复方案**:
```typescript
const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
  setZipProgress(metadata.percent);
});
```

---

## 🔵 P3-10: 滚动时 sticky Header 无阴影变化
**位置**: [Header.astro:27](file:///d:/去除图片元数据/src/components/Header.astro#L27)
**问题描述**:
- 滚动时 Header 始终无 shadow
- 视觉上不突出当前在 Header 之下

**修复方案**:
- 滚动时添加 `scroll-smooth shadow-md` 动态 class

---

## 🔵 P3-11: 内容页 Article index 滚动时与 Header 重叠
**位置**: [[slug].astro:76-103](file:///d:/去除图片元数据/src/pages/%5Bslug%5D.astro#L76-L103)
**问题描述**:
- `mt-10 p-6` 距顶部 40px
- 滚到该区块时，Header z-50 覆盖在内容之上
- 视觉上文字被遮挡 1-2 秒

---

## 🔵 P3-12: 移动端 Hero 区域 h1 字号过小
**位置**: [index.astro:33](file:///d:/去除图片元数据/src/pages/index.astro#L33)
**问题描述**:
- `text-2xl sm:text-3xl md:text-4xl`
- 移动端 text-2xl = 24px，对标题而言偏小
- 竞品（verexif.com）移动端 hero h1 通常 ≥ 30px

---

## 🔵 P3-13: Privacy Alert 移动端 SVG 与文字垂直对齐差
**位置**: [index.astro:22-29](file:///d:/去除图片元数据/src/pages/index.astro#L22-L29)
**问题描述**:
- `mt-0.5` SVG 与标题第一行有偏移
- 多行文字下，SVG 仅顶部对齐，不跟随文字流

---

## 🔵 P3-14: Footer 无回顶链接
**位置**: [BaseLayout.astro:84-89](file:///d:/去除图片元数据/src/layouts/BaseLayout.astro#L84-L89)
**问题描述**:
- 仅显示版权和隐私说明
- 缺少"Back to top"链接
- 内容多时回顶困难

---

## 🔵 P3-15: Hero 副标题在 SEO 区域重复
**位置**: [index.astro:34](file:///d:/去除图片元数据/src/pages/index.astro#L34), [index.astro:71-73](file:///d:/去除图片元数据/src/pages/index.astro#L71-L73)
**问题描述**:
- `t.hero.subtitle`: "100% local processing — your files never leave your device"
- `t.seoContent.p3`: "...files never leave your device — no server upload..."
- 重复表达相同内容
- SEO 关键词密度可能被算法降权（关键词堆砌）

---

## 🔵 P3-16: 内容页 hero CTA "Scroll to Top" 含义不清晰
**位置**: [index.astro:87](file:///d:/去除图片元数据/src/pages/index.astro#L87)
**问题描述**:
- `t.cta.button: "Scroll to Top"` 或中文"返回顶部"
- 但文案放在首页底部，期望用户回到顶部
- 用户在底部的心理预期是"开始使用工具"
- 翻译为德语"向上滚动"语义生硬
- 应改为 "Try It Now" 或 "Use the Tool"

---

## 🔵 P3-17: 移动端 MetaPanel 的视图切换按钮 "Detail"/"Before/After" 文字过短
**位置**: [MetaPanel.tsx:128-148](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L128-L148)
**问题描述**:
- 在 320px 宽屏下，"Before / After" 可能被截断
- 短语言如中文"对比"也只占 80px，但加上 padding 可能贴边

---

## 🔵 P3-18: DropZone 的 format badges 列表在移动端换行丑
**位置**: [DropZone.tsx:153-159](file:///d:/去除图片元数据/src/components/DropZone.tsx#L153-L159)
**问题描述**:
- 7 个格式徽章：JPG PNG WebP HEIC GIF AVIF TIFF
- 移动端 375px 宽度下，会换行成 2-3 行
- 视觉上不规则

---

# 第四部分：兼容、性能、安全隐患

## 🔵 性能-01: 大量 DOM 重绘 - PhotoCard 每张都创建 img
**位置**: [PhotoGrid.tsx:60-65](file:///d:/去除图片元数据/src/components/PhotoGrid.tsx#L60-L65)
**问题描述**:
- 50+ 照片时，浏览器同时加载 50+ 个 ObjectURL 图片
- 浏览器可能并发限制 6 个图片加载
- 滚动时加载慢

**修复方案**:
- 虚拟列表（react-window）
- 或懒加载（IntersectionObserver）

---

## 🔵 性能-02: 重复计算 SHA-256 - 每次 clean 都要算
**位置**: [ExifRemover.tsx:11-16](file:///d:/去除图片元数据/src/components/ExifRemover.tsx#L11-L16)
**问题描述**:
- 每张照片清理时计算 cleanedFile 的 SHA-256
- 大文件（10MB+）SHA-256 计算需要 100-300ms
- 50 张图依次处理：15 秒额外等待
- 用户看不到 SHA-256 验证功能的价值

**修复方案**:
- 改为可选/异步
- 或在 Web Worker 中计算

---

## 🔵 性能-03: 搜索无防抖 - 大列表 re-render 卡顿
**位置**: [MetaPanel.tsx:116-122](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L116-L122)
**问题描述**:
- 每次按键 onChange 立即触发 filter
- 100+ 标签的列表 + 实时过滤 → React 频繁 re-render

**修复方案**:
- useDeferredValue
- 或 useMemo + debounce

---

## 🔵 性能-04: Leaflet 库整体 import
**位置**: [MetaPanel.tsx:198](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L198)
**问题描述**:
- `import('leaflet')` 整个库 ~150KB
- 仅在有 GPS 数据时需要
- 可以拆分按需引入

---

## 🔵 性能-05: heic2any 库体积巨大
**位置**: [exif-cleaner.ts:11](file:///d:/去除图片元数据/src/lib/exif-cleaner.ts#L11)
**问题描述**:
- heic2any ~5MB（含 WASM/Workers）
- 仅在用户上传 HEIC 时需要
- 应改为动态 import

**修复方案**:
- `const { default: heic2any } = await import('heic2any');`

---

## 🔵 兼容-01: Safari iOS 不支持某些 EXIF 标签读取
**位置**: [exif-reader.ts:48-58](file:///d:/去除图片元数据/src/lib/exif-reader.ts#L48-L58)
**问题描述**:
- exifr 在 iOS Safari 上处理 HEIC 有时失败
- 用户上传 HEIC 后看到"Failed to read file"
- 缺乏 graceful degradation

**修复方案**:
- 捕获 exifr 特定错误码
- 提示用户用桌面浏览器或转换为 JPG

---

## 🔵 兼容-02: Firefox 不支持某些 CSS 特性
**位置**: [global.css](file:///d:/去除图片元数据/src/styles/global.css)
**问题描述**:
- Tailwind 4 + `@theme` 在 Firefox < 121 上可能不渲染
- backdrop-filter 模糊效果在老 Firefox 不支持
- 实测需要在 Firefox ESR 中验证

---

## 🔵 兼容-03: Windows 高 DPI 屏 DropZone 渐变背景失真
**位置**: [DropZone.tsx:106](file:///d:/去除图片元数据/src/components/DropZone.tsx#L106)
**问题描述**:
- `bg-gradient-to-br from-[var(--color-bg-alt)] to-blue-50/30` 在 125%/150% 缩放下可能产生 banding
- 应在所有渐变层加 `-webkit-optimize-contrast`

---

## 🔵 兼容-04: 微信内置浏览器（X5 内核）可能拦截文件上传
**位置**: [DropZone.tsx:99](file:///d:/去除图片元数据/src/components/DropZone.tsx#L99)
**问题描述**:
- 微信内置浏览器（X5）在某些 Android 版本上不触发 file input click
- 用户点击"Browse Files"无反应
- 缺乏备用方案（如直接显示文件选择链接）

---

## 🟠 安全-01: SHA-256 显示完整字符串可能被 XSS 注入利用
**位置**: [MetaPanel.tsx:91-96](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L91-L96)
**问题描述**:
- `{photo.sha256}` 通过 React 安全渲染，不存在 XSS
- 但 SHA-256 字符串本身无 XSS 风险
- **实际上这里是安全的**，标为"安全"的负面案例
- 但应**核实**：用户能否注入恶意 EXIF 标签名称？

**复现验证**:
- 上传包含 EXIF 标签名如 `<script>alert(1)</script>` 的图片
- exifr 库会读取并传给 tag.name
- React 自动转义，安全 ✓

---

## 🟠 安全-02: 标签值未做长度限制，可能导致 DoS
**位置**: [exif-reader.ts:66-92](file:///d:/去除图片元数据/src/lib/exif-reader.ts#L66-L92)
**问题描述**:
- 恶意构造的 EXIF 标签 value 可以是几 MB 字符串
- tags.push 直接存到 state
- 触发 re-render 时 React diff 几 MB string
- 浏览器卡死

**修复方案**:
```typescript
const displayValue = displayValue.length > 1000 
  ? displayValue.slice(0, 1000) + '...' 
  : displayValue;
```

---

## 🟠 安全-03: 第三方 tile.openstreetmap.org 无 CSP 配置
**位置**: [MetaPanel.tsx:212](file:///d:/去除图片元数据/src/components/MetaPanel.tsx#L212)
**问题描述**:
- 无 Content-Security-Policy meta 标签
- 任何第三方资源都可加载
- 应至少配置 `connect-src 'self' https://*.tile.openstreetmap.org`

**修复方案**:
- BaseLayout.astro 添加 `<meta http-equiv="Content-Security-Policy" content="...">`

---

## 🟡 SEO-01: sitemap.xml 占位符未更新
**位置**: [robots.txt:4](file:///d:/去除图片元数据/public/robots.txt#L4), [astro.config.mjs:7](file:///d:/去除图片元数据/astro.config.mjs#L7)
**问题描述**:
- `site: 'https://example.com'` 是占位符
- `Sitemap: https://example.com/sitemap-index.xml`
- **未更新为真实域名**
- 这是 P0 级别，因为影响所有 SEO 流量

**修复方案**:
```javascript
site: 'https://yourdomain.com',
```

---

## 🟡 SEO-02: og-image.svg 是矢量图，可能在某些平台不显示
**位置**: [BaseLayout.astro:37](file:///d:/去除图片元数据/src/layouts/BaseLayout.astro#L37)
**问题描述**:
- `og-image.svg` 在 Facebook、Twitter 等平台可能不显示
- 多数社交平台只支持 PNG/JPG
- 缺少 fallback

**修复方案**:
- 改为 `og-image.png` (1200x630)
- 或保留 SVG 但同时提供 PNG fallback

---

## 🟡 SEO-03: Apple touch icon 是 SVG，可能在某些 iOS 版本不显示
**位置**: [BaseLayout.astro:31](file:///d:/去除图片元数据/src/layouts/BaseLayout.astro#L31)
**问题描述**:
- iOS Safari 14+ 支持 SVG apple-touch-icon
- 但 iOS 13 及更早只支持 PNG
- 缺少 PNG 版本

---

## 🟡 SEO-04: 缺少 favicon.ico（实际有，但缺少 sizes）
**位置**: [BaseLayout.astro:30](file:///d:/去除图片元数据/src/layouts/BaseLayout.astro#L30)
**问题描述**:
- `favicon.svg` 是单一尺寸
- 高 DPI 屏显示模糊
- 缺少 `<link rel="icon" sizes="32x32" ...>` 等多尺寸

---

## 🟡 SEO-05: 缺少 RSS / Atom feed
**问题描述**:
- 10 篇 SEO 文章没有 RSS feed
- 内容站标配
- 用户订阅无途径

**修复方案**:
- 添加 `@astrojs/rss` 集成

---

## 🟡 SEO-06: 内容页缺少数值化元数据（rating、reading-time）
**位置**: [[slug].astro:40](file:///d:/去除图片元数据/src/pages/%5Bslug%5D.astro#L40)
**问题描述**:
- 缺少 `article:reading_time` og tag
- 缺少 `article:author`
- Twitter Cards 不完整

---

## 🟡 SEO-07: 缺少 hreflang 标签
**位置**: [BaseLayout.astro:23-78](file:///d:/去除图片元数据/src/layouts/BaseLayout.astro#L23-L78)
**问题描述**:
- 7 种语言但未配置 hreflang
- Google 可能判定重复内容
- 影响多语言 SEO

**修复方案**:
```html
<link rel="alternate" hreflang="en" href="..." />
<link rel="alternate" hreflang="zh" href="..." />
```

---

# 第五部分：页面细节优化清单

## 体验优化清单

1. **拖拽时显示文件类型预览**（"Release to upload 5 photos"）
2. **上传后文件大小累加显示**（"Total: 12.3 MB"）
3. **清理前预览**（哪些字段将被删除）
4. **清理后支持撤销**（"Undo Last Clean"）
5. **下载文件名自定义**（"cleaned-photos-2026-06-15.zip"）
6. **支持拖拽单个文件到具体 PhotoCard 上传到指定位置**
7. **键盘快捷键**（Ctrl+V 全局粘贴图片、Esc 关闭详情）
8. **清理完成后显示"Downloaded 5 photos"统计**
9. **多文件下载进度可视化**
10. **支持从剪贴板粘贴多张图时预览每张**

## 内容页优化清单

1. **添加 Table of Contents 浮动目录**（长文章）
2. **添加文章发布时间/更新时间显示**
3. **添加"相关文章"**（基于标签推荐）
4. **添加文章分享按钮**（Twitter/LinkedIn）
5. **代码块添加"复制"按钮**
6. **深色模式支持**
7. **打印样式优化**
8. **评论系统**（Disqus/Giscus）— 但用户要求无需持续维护，跳过

## Trust 元素优化

1. **添加"X photos processed today"社会证明**
2. **添加用户评价/Testimonials**
3. **添加安全审计徽章**
4. **添加开源 GitHub 链接**（未来扩展）

---

# 第六部分：代码规范整改建议

## TypeScript 严格度

1. **ExifRemover.tsx line 22**: `photosRef.current = photos` 在每次 render 时赋值，违反 React 思维模式
2. **exif-reader.ts line 25-32**: `formatValue` 接受 `unknown` 但未做严格类型检查
3. **多处使用 `any` 或隐式 `unknown`**：建议开启 `strict: true`

## React 最佳实践

1. **缺少 Error Boundary**：上传/清理失败时整个组件崩溃
2. **缺少 React.memo**：PhotoCard 在 photos 变化时全部 re-render
3. **useEffect 依赖项**：ExifRemover.tsx:43 的 effect 依赖 photos，每次变化都执行
4. **缺少 useCallback 包裹**：ExifRemover 中的 handleRemove 等已正确使用

## 文件组织

1. **缺少 utils 目录**：目前 utils 散落在 lib 和 components
2. **types 散落**：ExifData 等接口分散在多个文件
3. **常量文件**：ACCEPTED_TYPES 应该在独立 constants 文件

## 错误处理

1. **fetch/import 失败无降级**：heic2any import 失败时
2. **exifr 失败统一返回空对象**：丢失了错误信息
3. **canvas.toBlob 失败无重试机制**

## 测试

1. **零测试覆盖**：没有任何单元测试
2. **无 E2E 测试**：手动测试为主
3. **无视觉回归测试**：UI 改动易引入意外

## 性能监控

1. **无 Web Vitals 监控**
2. **无错误上报**（Sentry/LogRocket）
3. **无性能预算**

## 可访问性

1. **颜色对比度未审计**：部分 text-muted 在浅色背景可能不达标
2. **键盘导航未完整测试**
3. **屏幕阅读器测试未做**
4. **减少动画偏好未支持**（prefers-reduced-motion）

---

# 优先级排序

| 优先级 | BUG编号 | 建议 |
|--------|---------|------|
| **立即修复** | P0-01, P0-02, P0-03, SEO-01 | 内存安全 + 隐私 + SEO域名 |
| **本周修复** | P1-01 ~ P1-06, 安全-02, 安全-03 | 用户体验 + 安全 |
| **下迭代** | P2-01 ~ P2-12, 性能类 | 业务逻辑完善 |
| **长期优化** | P3-01 ~ P3-18, 体验清单 | 体验打磨 |

---

# 总结

- **致命BUG**: 4 个（需立即处理）
- **严重BUG**: 6 个（需本周处理）
- **业务逻辑BUG**: 12 个
- **UI/交互细节BUG**: 18 个
- **兼容/性能/安全**: 15 个
- **代码规范问题**: 8 类

**总问题数**: 60+

**建议**: 按优先级分 3 个 Sprint 处理
- Sprint 1（本周）：所有 P0 + SEO-01
- Sprint 2（下周）：所有 P1 + 安全类
- Sprint 3（迭代）：P2 + P3 + 体验优化

---

> 本报告仅记录问题，不包含代码修改。所有发现的问题需用户确认后单独修复。
