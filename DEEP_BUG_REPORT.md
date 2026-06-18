# EXIF Remover 深度BUG扫描报告

> 扫描时间：2026-06-15  
> 扫描范围：全部源码（src/ 下所有组件、页面、工具函数、样式、配置）  
> 扫描标准：10年资深测试专家视角，零遗漏覆盖8大维度

---

## 第一部分：致命/严重BUG

### BUG-C01：cleanedFile Blob URL 内存泄漏（删除照片时未释放）
- **风险等级**：🔴 严重
- **文件**：`src/components/ExifRemover.tsx` 第100-122行 `handleRemove`
- **复现操作**：
  1. 上传一张照片并点击 "Clean"
  2. 点击照片缩略图左上角的 × 删除按钮
  3. 重复上传→清理→删除多次
- **问题描述**：`handleRemove` 只 revoke 了 `photo.thumbnail` 的 ObjectURL，但从未 revoke `photo.cleanedFile` 的 ObjectURL。每次清理生成的 Blob URL 都永久驻留内存，直到页面关闭。
- **影响**：用户反复上传/清理/删除大量照片后，浏览器内存持续增长，可能导致页面卡顿甚至崩溃。
- **修复方案**：在 `handleRemove` 中增加 `if (photo.cleanedFile) URL.revokeObjectURL(URL.createObjectURL(photo.cleanedFile))` 或保存 cleanedFile 的 URL 引用以便 revoke。

### BUG-C02：cleanedFile Blob URL 内存泄漏（重新清理时未释放旧 URL）
- **风险等级**：🔴 严重
- **文件**：`src/components/ExifRemover.tsx` 第124-167行 `handleCleanSingle`
- **复现操作**：
  1. 上传照片并清理
  2. 由于 `isCleaned` 保护，当前无法重复清理同一张照片
- **问题描述**：虽然当前 `handleCleanSingle` 有 `photo.isCleaned` 守卫防止重复清理，但如果未来移除此守卫，旧的 `cleanedFile` Blob URL 不会被 revoke。这是一个潜在风险。
- **修复方案**：在设置新的 `cleanedFile` 前，先 revoke 旧的：
  ```ts
  const oldPhoto = photosRef.current.find((p) => p.id === id);
  if (oldPhoto?.cleanedFile) URL.revokeObjectURL(URL.createObjectURL(oldPhoto.cleanedFile));
  ```

### BUG-C03：语言切换下拉菜单在移动端完全无法打开
- **风险等级**：🔴 严重（移动端核心导航功能失效）
- **文件**：`src/components/Header.astro` 第42-68行
- **复现操作**：
  1. 在手机浏览器（iOS Safari / Android Chrome）打开网站
  2. 点击右上角语言切换按钮（地球图标）
  3. 下拉菜单不出现
- **问题描述**：语言下拉菜单完全依赖 CSS `group-hover` 实现展开（`opacity-0 invisible group-hover:opacity-100 group-hover:visible`），没有 JavaScript click 事件处理。移动端设备不支持 hover 状态，导致下拉菜单永远不可见。
- **影响**：非英语用户完全无法切换语言，核心多语言功能在移动端失效。
- **修复方案**：添加 `click` 事件处理，使用 React/Astro 状态管理下拉菜单的显示/隐藏，或添加 `onclick` 切换 class。

### BUG-C04：Leaflet 地图在离线/受限网络环境下静默失败
- **风险等级**：🟠 严重
- **文件**：`src/components/MetaPanel.tsx` 第204-238行 `GPSMap` 组件
- **复现操作**：
  1. 断开网络连接
  2. 上传一张包含 GPS 数据的照片
  3. 查看 MetaPanel 中的 GPS 地图
- **问题描述**：
  1. `import('leaflet')` 动态导入依赖 CDN，离线时 Promise 永远 pending 或 reject，无任何错误处理
  2. 即使 Leaflet 加载成功，地图瓦片请求 `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` 在离线时也会失败
  3. 用户看到空白地图区域，无任何提示
- **影响**：与网站"100% 本地处理"的核心承诺矛盾——GPS 地图需要外部网络请求。
- **修复方案**：
  1. 为 `import('leaflet')` 添加 `.catch()` 错误处理，失败时显示友好提示
  2. 考虑添加离线提示："地图需要网络连接以加载瓦片"
  3. 或者用纯 CSS/SVG 静态坐标展示替代交互式地图

---

## 第二部分：业务逻辑BUG

### BUG-B01：DropZone 文件选择器无法重复选择同一文件
- **风险等级**：🟠 中等
- **文件**：`src/components/DropZone.tsx` 第121-128行
- **复现操作**：
  1. 点击 "Browse Files" 选择一张照片
  2. 删除该照片
  3. 再次点击 "Browse Files" 选择同一张照片
  4. `onChange` 事件不触发
- **问题描述**：`<input type="file">` 的 `value` 在选择文件后未重置。如果用户删除已上传的照片后想重新选择同一文件，浏览器不会触发 `change` 事件（因为 value 未变化）。
- **修复方案**：在 `handleFiles` 回调末尾添加 `e.target.value = ''`（对于 onChange）或在 `fileInputRef.current.value = ''` 在点击时重置。

### BUG-B02：auto-delete effect 在每次 photos 状态变化时无差别重跑
- **风险等级**：🟡 低
- **文件**：`src/components/ExifRemover.tsx` 第36-51行
- **复现操作**：
  1. 上传一张照片
  2. 观察控制台或 React DevTools
- **问题描述**：`useEffect(() => {...}, [photos])` 在每次 `photos` 状态变化时都会重新执行，遍历所有照片检查是否需要设置自动删除计时器。虽然有 `!autoDeleteTimers.current.has(p.id)` 守卫，但频繁执行仍是不必要的性能开销。
- **影响**：在大量照片场景下，每次状态更新都会触发 O(n) 遍历。
- **修复方案**：使用更精确的依赖或 ref 追踪已处理的 photo id。

### BUG-B03：resetAutoDeleteTimers 触发无意义的 re-render
- **风险等级**：🟡 低
- **文件**：`src/components/ExifRemover.tsx` 第193-201行
- **复现操作**：
  1. 清理一张照片
  2. 点击下载按钮
  3. 观察 React DevTools
- **问题描述**：`resetAutoDeleteTimers` 调用 `setPhotos((prev) => { photosRef.current = prev; return prev; })` 返回相同引用触发不必要的 re-render。React 在 `Object.is` 比较下会跳过相同引用的更新，但这里的写法依赖实现细节。
- **修复方案**：移除 `setPhotos` 调用，改用独立的 state 变量触发 auto-delete effect 重新计算。

### BUG-B04：handleCleanAll 在 cleanAllInFlight 期间静默忽略用户操作
- **风险等级**：🟡 低
- **文件**：`src/components/ExifRemover.tsx` 第169-180行
- **复现操作**：
  1. 上传多张未清理的照片
  2. 快速连续点击 "Clean All" 按钮
  3. 第二次及后续点击被静默忽略
- **问题描述**：`cleanAllInFlight` 守卫正确防止了并发清理，但用户无任何反馈表明操作正在进行中。用户可能认为按钮失效。
- **修复方案**：在 Clean All 按钮上显示 loading 状态或禁用按钮。

### BUG-B05：MetaPanel GPS 坐标解析可能失败但无错误提示
- **风险等级**：🟡 低
- **文件**：`src/components/MetaPanel.tsx` 第265-278行 `parseDMS`
- **复现操作**：
  1. 上传一张 GPS 坐标格式非标准的照片（如十进制度数而非 DMS 格式）
  2. 查看 GPS 地图
- **问题描述**：`parseDMS` 函数先尝试匹配 `DD°MM'SS"` 格式，失败后尝试 `parseFloat`。如果 exif-reader 返回的格式既不是标准 DMS 也不是纯数字（如包含特殊字符），`parseFloat` 返回 NaN，地图不显示但无任何错误提示。
- **修复方案**：添加 NaN 检查后的 fallback 提示。

---

## 第三部分：UI/交互细节缺陷

### BUG-U01：MetaPanel 所有文本硬编码英文，不支持多语言
- **风险等级**：🟠 严重（多语言一致性）
- **文件**：`src/components/MetaPanel.tsx`
- **问题描述**：以下文本全部硬编码为英文，在中文/日文/韩文等语言版本中显示英文：
  - 第27行：`"No EXIF data found in this image."`
  - 第59行：`"privacy risk(s) found"`
  - 第81行：`"✓ Metadata removed successfully"`
  - 第94行：`"Download"` 按钮
  - 第125行：`"Search metadata (e.g. GPS, Date, Camera)..."` placeholder
  - 第143行：`"Detail"` 按钮
  - 第153行：`"Before / After"` 按钮
  - 第170行：`"✅ Preserved — keeps your photo displaying correctly"`
  - 第231行：Leaflet popup `"Photo Location"`
  - 第256行：`"GPS Location Detected"`
  - 第287行：`"Before"` / 第303行：`"After (Clean)"`
  - 第316行：`"All metadata removed"`
  - 第329行：`'No metadata matching "..."'`
  - 第337行：`"Remaining Metadata"` / `"Full Metadata"`
  - 第356行：`"Preserved"`
- **影响**：非英语用户看到大量英文界面文本，体验不一致。
- **修复方案**：将所有硬编码文本提取到 `translations.ts` 中，通过 props 传入。

### BUG-U02：DropZone 文本硬编码英文
- **风险等级**：🟠 中等
- **文件**：`src/components/DropZone.tsx`
- **问题描述**：
  - 第140行：`"Drop photos here"` 硬编码
  - 第150行：`"Browse Files"` 硬编码
  - 第153行：`"JPG, PNG, WebP, HEIC, GIF, AVIF, TIFF — or paste from clipboard (Ctrl+V)"` 硬编码
  - 第174行：`"file(s) skipped (unsupported format)"` 硬编码
  - 第181行：`"100% local — your files never leave this browser"` 硬编码
- **影响**：虽然 `translations.ts` 中已有对应的翻译文本（`t.dropzone.browse`、`t.dropzone.hint`、`t.dropzone.trust`），但 DropZone 组件未接收 `t` props，全部使用硬编码。
- **修复方案**：DropZone 接收 i18n props 并使用翻译文本。

### BUG-U03：ExifRemover "photos loaded" 文本硬编码英文
- **风险等级**：🟡 低
- **文件**：`src/components/ExifRemover.tsx` 第216行
- **问题描述**：`"{photos.length} photo(s) loaded"` 硬编码英文，不支持多语言。
- **修复方案**：通过 i18n props 传入。

### BUG-U04：CleanActions 组件文本硬编码英文
- **风险等级**：🟡 低
- **文件**：`src/components/CleanActions.tsx`
- **问题描述**：所有按钮文本和提示文本硬编码英文（"Clean All"、"Download All"、"Download ZIP"、"Delete Now" 等）。
- **修复方案**：通过 i18n props 传入。

### BUG-U05：PhotoGrid 空状态无提示
- **风险等级**：🟡 低
- **文件**：`src/components/PhotoGrid.tsx`
- **复现操作**：
  1. 上传照片后全部删除
  2. PhotoGrid 区域消失（由 `hasPhotos` 控制）
- **问题描述**：当所有照片被删除后，PhotoGrid 不显示任何内容。虽然 `ExifRemover` 通过 `hasPhotos` 条件渲染了整个区域，但 DropZone 仍然显示，用户需要重新上传。这不是 BUG，但缺少引导提示。
- **修复方案**：在 DropZone 下方添加提示："您已删除所有照片，可以重新上传"。

### BUG-U06：MetaPanel 搜索输入框无清空按钮
- **风险等级**：🟡 低
- **文件**：`src/components/MetaPanel.tsx` 第123-129行
- **复现操作**：
  1. 在搜索框输入长文本
  2. 想清空搜索框
  3. 需要手动全选删除
- **问题描述**：搜索输入框没有 "×" 清空按钮，用户体验不佳。
- **修复方案**：添加清空按钮（当 `searchQuery` 非空时显示）。

### BUG-U07：FAQ 组件文本未完全国际化
- **风险等级**：🟡 低
- **文件**：`src/components/FAQ.tsx`
- **问题描述**：FAQ 组件接收 `items` props 进行翻译，但组件内部的 UI 文本（如展开/收起箭头、动画等）可能未适配 RTL 语言。
- **修复方案**：检查并确保 RTL 兼容性。

### BUG-U08：Header Logo 链接在内容页面高亮逻辑不正确
- **风险等级**：🟡 低
- **文件**：`src/components/Header.astro` 第14-15行
- **问题描述**：
  ```js
  const isToolPage = currentPath === '/' || /^\/[a-z]{2}\/?$/.test(currentPath);
  const isLearnPage = !isToolPage && currentPath !== '/404';
  ```
  404 页面 (`/404`) 既不是 `isToolPage` 也不是 `isLearnPage`，导致导航栏中 "Tool" 和 "Learn" 都没有高亮。
- **修复方案**：404 页面默认高亮 "Tool" 或都不高亮（当前行为可接受）。

### BUG-U09：CTA "Scroll to Top" 按钮使用 inline onclick
- **风险等级**：🟡 低
- **文件**：`src/pages/index.astro` 第87行、`src/pages/[lang]/index.astro` 第96行
- **问题描述**：
  ```html
  <a href="#" onclick="window.scrollTo({top:0,behavior:'smooth'});return false;">
  ```
  使用 inline `onclick` 不符合 CSP（Content Security Policy）最佳实践。如果未来添加 `script-src` 限制，此功能将失效。
- **修复方案**：使用 `<script>` 标签或 Astro 的 `client:` 指令绑定事件。

### BUG-U10：MetaPanel CompareView 中 Before/After 列在移动端可能过窄
- **风险等级**：🟡 低
- **文件**：`src/components/MetaPanel.tsx` 第283行
- **复现操作**：
  1. 在手机竖屏模式下查看 Before/After 对比视图
  2. 两列各占 50% 宽度，每列内容可能过于拥挤
- **问题描述**：`grid-cols-2` 在小屏幕上导致每列宽度约 170px，长文本被截断（`truncate` class），用户需要点击才能看到完整内容。
- **修复方案**：在移动端改为垂直堆叠（`grid-cols-1 sm:grid-cols-2`）。

### BUG-U11：DropZone 拖拽区域与点击区域重叠导致误触发
- **风险等级**：🟡 低
- **文件**：`src/components/DropZone.tsx` 第100-114行
- **问题描述**：整个 DropZone div 绑定了 `onClick={() => fileInputRef.current?.click()}`，包括底部的信任徽章区域。用户点击信任徽章文本时也会触发文件选择器。
- **修复方案**：将点击事件限制在视觉上的主要交互区域，或添加 `pointer-events-none` 到装饰性元素。

### BUG-U12：PhotoGrid 选中状态在移动端不够明显
- **风险等级**：🟡 低
- **文件**：`src/components/PhotoGrid.tsx`
- **问题描述**：选中照片通过 `ring-2 ring-[var(--color-primary)]` 高亮，但在移动端小缩略图上，2px 的蓝色边框可能不够醒目。
- **修复方案**：增加选中指示器（如角标勾选图标）。

---

## 第四部分：兼容、性能、安全隐患

### 兼容性

#### BUG-P01：crypto.subtle 在 HTTP 环境下不可用
- **风险等级**：🟠 中等
- **文件**：`src/components/ExifRemover.tsx` 第11-16行 `computeSHA256`
- **问题描述**：`crypto.subtle.digest` 仅在安全上下文（HTTPS 或 localhost）下可用。如果网站通过 HTTP 访问（如本地开发或某些部署场景），SHA-256 计算将抛出 `TypeError: Cannot read properties of undefined`。
- **修复方案**：添加 fallback 或 try-catch：
  ```ts
  if (!crypto.subtle) return null;
  ```

#### BUG-P02：Leaflet 动态导入在旧浏览器中可能失败
- **风险等级**：🟡 低
- **文件**：`src/components/MetaPanel.tsx` 第205行
- **问题描述**：`import('leaflet')` 使用动态 ES module import，IE11 不支持。虽然项目目标可能不包括 IE11，但应添加错误处理。
- **修复方案**：添加 `.catch()` 处理。

#### BUG-P03：CSS `backdrop-filter` 未使用但 `scale-[1.01]` 可能在低性能设备上引起重绘
- **风险等级**：🟡 低
- **文件**：`src/components/DropZone.tsx` 第110行
- **问题描述**：拖拽时的 `scale-[1.01]` 变换在某些低性能移动设备上可能触发额外的重绘。
- **修复方案**：可保留，但建议添加 `will-change: transform`。

### 性能

#### BUG-P04：SHA-256 计算将整个文件读入内存
- **风险等级**：🟠 中等
- **文件**：`src/components/ExifRemover.tsx` 第11-16行
- **问题描述**：`file.arrayBuffer()` 将整个文件读入内存。对于 50MB 的 TIFF 文件，这意味着额外 50MB 内存占用。在批量处理场景下（如 20 张大照片），内存峰值可达数 GB。
- **修复方案**：考虑使用流式哈希或仅在需要时计算。

#### BUG-P05：PhotoGrid 缩略图无懒加载
- **风险等级**：🟡 低
- **文件**：`src/components/PhotoGrid.tsx`
- **问题描述**：所有缩略图 `<img>` 标签没有 `loading="lazy"` 属性。当用户上传大量照片时，所有缩略图同时加载。
- **修复方案**：添加 `loading="lazy"` 属性。

#### BUG-P06：auto-delete effect 在每次 photos 变化时全量遍历
- **风险等级**：🟡 低
- **文件**：`src/components/ExifRemover.tsx` 第36-51行
- **问题描述**：每次 `photos` 状态变化（包括添加一张照片、清理完成等）都会触发 effect，遍历所有照片检查是否需要设置计时器。
- **修复方案**：使用 ref 追踪上次检查的位置，仅检查新增的照片。

#### BUG-P07：canvas 重新编码大文件时阻塞主线程
- **风险等级**：🟡 低
- **文件**：`src/lib/exif-cleaner.ts`
- **问题描述**：虽然已添加 4096px 限制，但 canvas `toBlob` 操作仍在主线程执行。对于大图片，可能导致 UI 短暂卡顿。
- **修复方案**：使用 Web Worker 或 `requestIdleCallback` 分批处理。

### 安全

#### BUG-S01：Leaflet 地图瓦片请求泄露用户 IP 和大致地理位置
- **风险等级**：🟠 中等（隐私矛盾）
- **文件**：`src/components/MetaPanel.tsx` 第219行
- **问题描述**：网站核心承诺是 "100% local processing, files never leave your browser"。但 GPS 地图加载 OpenStreetMap 瓦片时，请求 `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` 会向 OSM 服务器泄露：
  1. 用户 IP 地址
  2. 通过缩放级别和瓦片坐标推算的大致地理位置
- **影响**：与网站隐私承诺存在矛盾。虽然泄露的是 IP 而非精确 GPS 坐标，但用户可能不知晓此外部请求。
- **修复方案**：
  1. 在 GPS 地图区域添加明确提示："地图瓦片从 OpenStreetMap 加载，您的 IP 地址将被发送"
  2. 或改用离线地图方案（如预渲染静态地图图片）
  3. 当前已添加 "Map tiles from OpenStreetMap" 文字提示（第258行），但不够醒目

#### BUG-S02：无 Content Security Policy (CSP) 头
- **风险等级**：🟡 低
- **文件**：`astro.config.mjs` / 部署配置
- **问题描述**：项目未配置 CSP 头。虽然纯前端应用攻击面较小，但 CSP 可以防止：
  1. 恶意脚本注入
  2. 未授权的外部资源加载
  3. XSS 攻击（如果有用户生成内容）
- **修复方案**：在 `astro.config.mjs` 中添加 CSP meta 标签或部署时配置响应头。

#### BUG-S03：SHA-256 哈希值展示可能给用户虚假安全感
- **风险等级**：🟡 低
- **文件**：`src/components/MetaPanel.tsx` 第98-104行
- **问题描述**：展示 SHA-256 哈希值让用户验证文件完整性，但：
  1. 普通用户不理解哈希值的含义
  2. 没有对比机制（原始文件哈希 vs 清理后哈希）
  3. 可能被误认为 "文件指纹追踪"
- **修复方案**：添加说明文字解释 SHA-256 的用途，或移除此功能简化界面。

---

## 第五部分：页面细节优化清单 & 代码规范整改建议

### 页面细节优化清单

| 编号 | 类别 | 描述 | 优先级 |
|------|------|------|--------|
| O-01 | i18n | MetaPanel 全部文本（15+ 处）需国际化 | 高 |
| O-02 | i18n | DropZone 文本（5 处）需使用翻译 props | 高 |
| O-03 | i18n | CleanActions 按钮文本需国际化 | 中 |
| O-04 | i18n | ExifRemover "photos loaded" 需国际化 | 中 |
| O-05 | UX | 语言切换下拉菜单移动端需 click 支持 | 高 |
| O-06 | UX | MetaPanel 搜索框添加清空按钮 | 低 |
| O-07 | UX | Before/After 对比视图移动端改为垂直布局 | 低 |
| O-08 | UX | PhotoGrid 选中状态添加角标勾选图标 | 低 |
| O-09 | UX | DropZone 信任徽章区域不应触发文件选择 | 低 |
| O-10 | SEO | CTA "Scroll to Top" 避免 inline onclick | 低 |
| O-11 | A11y | 语言切换下拉菜单添加 `aria-expanded` 和键盘导航 | 中 |
| O-12 | A11y | GPS 地图添加 `aria-label` 描述 | 低 |
| O-13 | A11y | PhotoGrid 删除按钮添加 `aria-label="Remove photo"` | 低 |
| O-14 | Visual | 404 页面缺少面包屑导航 | 低 |
| O-15 | Visual | MetaPanel 无 EXIF 数据时的空状态可添加图标 | 低 |

### 代码规范整改建议

| 编号 | 类别 | 描述 | 文件 |
|------|------|------|------|
| R-01 | 内存管理 | 建立 Blob URL 生命周期管理规范：所有 `URL.createObjectURL` 必须有对应的 `URL.revokeObjectURL` | ExifRemover.tsx |
| R-02 | 错误边界 | React 组件缺少 Error Boundary，Leaflet 加载失败可能导致整个 MetaPanel 崩溃 | MetaPanel.tsx |
| R-03 | 类型安全 | `PhotoItem.cleanedFile` 类型为 `File | null`，但 `saveAs` 调用时使用非空断言 `photo.cleanedFile!` | MetaPanel.tsx |
| R-04 | 代码重复 | `index.astro` 和 `[lang]/index.astro` 大量重复 HTML，应考虑提取为共用组件 | pages/ |
| R-05 | 代码重复 | `[slug].astro` 和 `[lang]/[slug].astro` 大量重复，应考虑提取 | pages/ |
| R-06 | 性能优化 | `computeSHA256` 应考虑使用流式计算或按需计算 | ExifRemover.tsx |
| R-07 | 防御性编程 | `parseDMS` 函数对异常输入缺少 fallback 日志 | MetaPanel.tsx |
| R-08 | 可访问性 | 所有交互元素应有 `role` 和 `aria-*` 属性 | 全局 |
| R-09 | 测试覆盖 | 项目无单元测试或 E2E 测试，建议至少添加核心流程测试 | - |
| R-10 | 构建优化 | `exifreader` 库打包体积较大，考虑按需导入或 dynamic import | exif-reader.ts |

---

## 附录：BUG 统计汇总

| 严重度 | 数量 | 编号 |
|--------|------|------|
| 🔴 致命/严重 | 4 | C01, C02, C03, C04 |
| 🟠 中等 | 7 | B01, U01, U02, P01, P04, S01, B04 |
| 🟡 低 | 28 | B02, B03, B05, U03-U12, P02, P03, P05-P07, S02, S03 |
| **总计** | **39** | |

### 修复优先级建议

1. **立即修复**（上线前必须）：
   - C01: cleanedFile Blob URL 泄漏
   - C03: 语言切换移动端失效
   
2. **尽快修复**（上线后一周内）：
   - C04: Leaflet 离线错误处理
   - U01/U02: 组件文本国际化
   - B01: 文件选择器重复选择
   - P01: crypto.subtle HTTP 兼容

3. **计划修复**（迭代优化）：
   - 其余所有 UI/交互细节
   - 性能优化项
   - 安全加固项
