# 深度BUG扫描报告（第三轮）

> 扫描时间：2026-06-15
> 扫描身份：10年资深网站测试专家
> 扫描范围：全量源码（18个核心文件）
> 扫描维度：致命崩溃 / 业务逻辑 / 交互细节 / UI视觉 / 多浏览器兼容 / 边缘场景 / 安全风控 / 性能隐患

---

## 第一部分：致命严重BUG

### F01 — 超大图片Canvas绘制导致浏览器标签页崩溃
- **风险等级**：🔴 致命（P0）
- **文件**：`src/lib/exif-cleaner.ts` L58-L66
- **复现操作**：上传一张 8000×6000 的JPEG图片（48MP手机照片常见尺寸），点击Clean Photo
- **问题**：虽然代码限制了4096px最大尺寸，但 `img.onload` 中先创建canvas再判断尺寸。对于超大图片，`img.naturalWidth` 和 `img.naturalHeight` 本身不会导致崩溃，但 `canvas.width = swap ? height : width` 在swap为true时可能创建 4096×4096 的canvas（约64MB像素内存）。如果用户同时处理多张超大图，内存叠加会导致浏览器标签页直接崩溃（OOM）。
- **修复方案**：1) 在 `removeExifViaCanvas` 入口处增加文件大小检查（如 >50MB 直接拒绝）；2) 处理前检查 `performance.memory`（Chrome）或用 try-catch 包裹 canvas 操作；3) 串行处理而非并行。

### F02 — HEIC转换失败时无回退机制，用户看到空白结果
- **风险等级**：🔴 致命（P0）
- **文件**：`src/lib/exif-cleaner.ts` L10-L16
- **复现操作**：在Firefox/Safari中上传HEIC文件（heic2any在这些浏览器中可能失败），点击Clean
- **问题**：`convertHeicToJpeg` 中 `heic2any` 如果抛出异常，`cleanFile` 函数没有 try-catch 包裹 HEIC 转换步骤。异常会直接冒泡到 `handleCleanSingle` 的 catch 块，但此时 `photo.file` 仍是原始HEIC文件，错误消息虽然提到了HEIC，但用户无法得到任何有用结果。
- **修复方案**：在 `cleanFile` 中为 HEIC 转换添加 try-catch，失败时提供明确的错误提示并跳过该文件。

### F03 — `crypto.randomUUID()` 在非HTTPS环境直接抛异常导致上传功能完全失效
- **风险等级**：🔴 致命（P0）
- **文件**：`src/components/ExifRemover.tsx` L66
- **复现操作**：在HTTP环境（非localhost）打开网站，上传任何图片
- **问题**：`crypto.randomUUID()` 要求安全上下文（HTTPS或localhost）。在HTTP环境下会抛出 `TypeError: crypto.randomUUID is not a function`，导致整个上传流程崩溃，用户无法使用任何功能。
- **修复方案**：添加 fallback：`const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);`

### F04 — Leaflet CSS未加载导致地图瓦片叠加/错位
- **风险等级**：🔴 严重（P1）
- **文件**：`src/components/MetaPanel.tsx` L219-L251
- **复现操作**：上传含GPS的图片，观察地图显示
- **问题**：代码动态 `import('leaflet')` 但未动态加载 Leaflet 的 CSS 文件。Leaflet 的地图瓦片定位、控件布局完全依赖其CSS。缺少CSS会导致：地图瓦片错位叠加、缩放控件位置异常、标记点偏移。这是间歇性问题——如果其他页面或CDN缓存已加载过Leaflet CSS则正常，首次访问必现。
- **修复方案**：在动态import leaflet时同时注入CSS：`const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1/dist/leaflet.css'; document.head.appendChild(link);`

---

## 第二部分：业务逻辑BUG

### L01 — Clean All只清理有风险的图片，无风险但含EXIF的图片被遗漏
- **风险等级**：🟡 中（P2）
- **文件**：`src/components/ExifRemover.tsx` L184
- **复现操作**：上传2张图片，一张含GPS（high risk），一张只有Make/Model（medium risk已被清理或只有low risk标签），点击Clean All
- **问题**：`handleCleanAll` 过滤条件 `riskCount.high > 0 || riskCount.medium > 0`，如果某张图片只有low risk标签（如Orientation、ColorSpace），它不会被Clean All处理。用户期望"Clean All"是清理所有未清理的图片。
- **修复方案**：改为 `!p.isCleaned && !p.isProcessing && p.exifData`，或者根据用户预期调整过滤条件并添加说明。

### L02 — 已清理图片再次点击Clean Photo无任何反馈
- **风险等级**：🟡 中（P2）
- **文件**：`src/components/ExifRemover.tsx` L137
- **复现操作**：清理一张图片后，在MetaPanel中再次点击Clean Photo按钮
- **问题**：`handleCleanSingle` 中 `if (!photo || photo.isProcessing || photo.isCleaned) return;` 直接return，用户点击后无任何视觉反馈，可能误以为按钮坏了。
- **修复方案**：当 `photo.isCleaned` 时显示toast提示"此图片已清理"或禁用按钮。

### L03 — 删除照片后selectedId可能指向已删除照片的ID
- **风险等级**：🟡 中（P2）
- **文件**：`src/components/ExifRemover.tsx` L111-L133
- **复现操作**：上传3张图片，选中第2张，删除第2张
- **问题**：`handleRemove` 中 `setSelectedId` 使用了 `remaining` 变量，但 `remaining` 是在 `setPhotos` 的回调中赋值的。由于React的批处理机制，`remaining` 可能在 `setSelectedId` 执行时仍为空数组（首次渲染时）。虽然大多数情况下工作正常，但这是一个潜在的竞态条件。
- **修复方案**：将 `setSelectedId` 的逻辑移到 `setPhotos` 回调外部，使用函数式更新确保基于最新状态。

### L04 — 5分钟自动删除计时器在页面刷新/关闭后不持久化，但cleanedFile引用也丢失
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/ExifRemover.tsx` L47-L61
- **复现操作**：清理图片后刷新页面
- **问题**：页面刷新后所有状态丢失（包括cleanedFile），这是预期行为。但如果用户在另一个标签页打开了同一网站，两个标签页的状态互不影响，可能导致混淆。
- **修复方案**：这是纯前端工具的固有限制，无需修复。但可以在页面unload前提示用户保存文件。

### L05 — Before/After对比视图中，After列的RiskBadge硬编码为"low"
- **风险等级**：🟡 中（P2）
- **文件**：`src/components/MetaPanel.tsx` L344
- **复现操作**：清理一张含GPS+相机信息的图片，切换到Before/After视图
- **问题**：`<RiskBadge level="low" compact />` 硬编码了low等级。清理后保留的标签（如Orientation、ColorSpace）确实是low risk，但如果将来有其他保留标签不是low risk，这里会显示错误。
- **修复方案**：使用 `tag.riskLevel` 替代硬编码的 `"low"`。

### L06 — 内容页文章标题未翻译，多语言页面显示英文标题
- **风险等级**：🟡 中（P2）
- **文件**：`src/pages/[lang]/[slug].astro` L50, `src/pages/[lang]/index.astro` L106-114
- **复现操作**：切换到中文/日文等语言，查看内容页标题和文章列表
- **问题**：文章标题 `doc.data.title` 来自content collection，始终是英文。多语言页面上的文章列表和h1标题都是英文，与页面其他翻译内容不一致，降低用户信任度。
- **修复方案**：为content collection添加多语言标题字段，或在翻译系统中添加文章标题映射。

### L07 — 内容页的"Learn More"链接始终指向 `/what-is-exif-data`
- **风险等级**：🟢 低（P3）
- **文件**：`src/pages/[slug].astro` L35, `src/pages/[lang]/[slug].astro` L45
- **复现操作**：在任意内容页点击面包屑中的"Learn"链接
- **问题**：面包屑中"Learn"链接硬编码指向 `/what-is-exif-data`，但应该指向文章列表页（如果存在的话）或保持当前行为。这不是BUG但可能不符合用户预期。

### L08 — FAQ默认内容与翻译内容不同步
- **风险等级**：🟡 中（P2）
- **文件**：`src/components/FAQ.tsx` L12-L33
- **复现操作**：在不传items prop时使用FAQ组件
- **问题**：`DEFAULT_FAQS` 中的第4条回答包含"HEIC/HEIF, GIF, AVIF, and TIFF are automatically converted to JPEG during processing"，但翻译系统中的FAQ回答（`t.faqItems`）没有这句话。两套FAQ内容不一致。
- **修复方案**：统一DEFAULT_FAQS和翻译系统中的FAQ内容，或移除DEFAULT_FAQS强制使用翻译版本。

---

## 第三部分：UI/交互细节小缺陷

### U01 — 搜索框清空按钮缺少aria-label国际化
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/MetaPanel.tsx` L137
- **问题**：`aria-label="Clear search"` 硬编码英文，未使用翻译系统。
- **修复方案**：在translations中添加clearSearch键并使用 `t.tool.clearSearch`。

### U02 — PhotoCard中删除按钮与选择按钮重叠区域导致误触
- **风险等级**：🟡 中（P2）
- **文件**：`src/components/PhotoGrid.tsx` L59-L116
- **问题**：删除按钮（左上角 ✕）和选择按钮（整个卡片）重叠。在移动端，删除按钮只有32×32px（w-8 h-8），小于44px最小触摸目标。用户尝试删除时可能误选照片，尝试选择时可能误删。
- **修复方案**：增大删除按钮到44×44px，或添加长按删除交互。

### U03 — 格式徽章（JPG/PNG/WebP等）未国际化
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/DropZone.tsx` L161
- **问题**：格式徽章硬编码 `['JPG', 'PNG', 'WebP', 'HEIC', 'GIF', 'AVIF', 'TIFF']`，这些是技术缩写不需要翻译，但列表与 `ACCEPTED_TYPES` 和 `ACCEPTED_EXTENSIONS` 是独立维护的，可能出现不一致。
- **修复方案**：从 `ACCEPTED_EXTENSIONS` 正则中提取格式列表，或统一维护一个格式常量。

### U04 — RiskBadge中emoji图标在部分系统上显示为方块
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/RiskBadge.tsx` L10-L12
- **问题**：使用emoji（🔴🟡🟢）作为风险等级图标，在Windows终端、部分Linux桌面、旧版Android上可能显示为方块或空白。
- **修复方案**：替换为SVG圆点图标，与项目中其他SVG图标风格一致。

### U05 — 搜索框输入超长文本时溢出
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/MetaPanel.tsx` L125-L131
- **问题**：搜索框没有maxLength限制，输入超长文本时虽然不会崩溃，但清空按钮可能被挤出可视区域（因为 `pr-9` 是固定值）。
- **修复方案**：添加 `maxLength={100}` 或确保清空按钮始终可见。

### U06 — CompareView中beforeTags列表无高度限制时内容过多
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/MetaPanel.tsx` L323
- **问题**：`max-h-64` 限制了高度，但内部没有虚拟滚动，当标签数量很多时（50+），滚动体验可能卡顿。
- **修复方案**：对于大量标签场景考虑虚拟滚动，或降低 max-h 值。

### U07 — 页面底部"Learn More"标题混合语言
- **风险等级**：🟡 中（P2）
- **文件**：`src/pages/index.astro` L97, `src/pages/[lang]/index.astro` L106
- **问题**：`{t.nav.learn} More` 拼接方式在非英语语言下产生混合语言文本。例如中文页面显示"学习 More"，日文页面显示"学ぶ More"，这不符合任何语言的语法。
- **修复方案**：在翻译系统中添加完整的 `learnMoreTitle` 键，如中文"了解更多"、日文"もっと学ぶ"。

### U08 — 内容页文章列表中当前文章高亮但不可点击，缺少视觉区分
- **风险等级**：🟢 低（P3）
- **文件**：`src/pages/[slug].astro` L82-L87
- **问题**：当前文章在列表中有 `bg-blue-50 text-primary font-medium` 样式，但仍然是 `<a>` 标签可点击。点击后刷新同一页面，用户体验不佳。
- **修复方案**：当前文章使用 `<span>` 替代 `<a>`，或添加 `aria-current="page"`。

### U09 — CTA按钮"Scroll to Top"在内容页指向 `href="#"`
- **风险等级**：🟢 低（P3）
- **文件**：`src/pages/[slug].astro` L54, `src/pages/[lang]/[slug].astro` L64
- **问题**：CTA按钮的 `href="/"` 或 `href="/${currentLang}/"` 会导航到首页而非滚动到顶部。虽然首页的CTA使用了 `id="cta-scroll-top"` + JS滚动，但内容页的CTA按钮是导航链接，行为不一致。
- **修复方案**：统一CTA按钮行为——内容页也应滚动到顶部或导航到首页工具区域。

### U10 — 处理中状态（isProcessing）的图片仍可被选中查看空面板
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/ExifRemover.tsx` L260
- **问题**：当图片正在处理时（`isProcessing: true`），`exifData` 为 null，MetaPanel 会显示"No EXIF data found"提示，误导用户以为图片没有EXIF数据。
- **修复方案**：在MetaPanel中添加处理中状态的展示（loading spinner + 提示文字），或在图片处理中时禁止选中。

### U11 — 移动端MetaPanel搜索框和视图切换按钮布局拥挤
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/MetaPanel.tsx` L119-L170
- **问题**：`flex-col sm:flex-row` 在移动端搜索框和视图切换按钮垂直排列，但视图切换按钮的 `shrink-0` 使其不会缩小。在小屏设备上（< 375px），两个按钮可能溢出。
- **修复方案**：添加 `min-w-0` 到搜索框容器，或使用 `overflow-hidden`。

### U12 — GPS地图popup内容未国际化
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/MetaPanel.tsx` L245
- **问题**：`bindPopup` 中使用了 `t.tool.photoLocation`，这是正确的。但坐标格式 `toFixed(6)` 在不同地区应使用不同的数字格式（如德语用逗号作小数点）。
- **修复方案**：使用 `Intl.NumberFormat` 格式化坐标。

### U13 — Header语言切换菜单在快速hover/click时可能闪烁
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/Header.astro` L110-L111
- **问题**：虽然已添加 `clickedOpen` 守卫，但在快速 hover→click→mouseleave 序列下，菜单可能出现短暂的闪烁（先被hover打开，再被click切换，再被mouseleave关闭）。
- **修复方案**：添加 debounce 或在 click 后短暂禁用 hover 事件。

### U14 — 清理后文件名中的 `-clean` 后缀可能与原文件名冲突
- **风险等级**：🟢 低（P3）
- **文件**：`src/lib/exif-cleaner.ts` L93-L94
- **问题**：如果原文件名已经是 `photo-clean.jpg`，清理后变成 `photo-clean-clean.jpg`。虽然不会导致功能问题，但文件名不优雅。
- **修复方案**：检查原文件名是否已包含 `-clean` 后缀，如果是则不再添加。

### U15 — DropZone点击区域包含"Browse Files"按钮，导致双重触发
- **风险等级**：🟢 低（P3）
- **文件**：`src/components/DropZone.tsx` L106, L146
- **问题**：整个DropZone div 有 `onClick={() => fileInputRef.current?.click()}`，内部的"Browse Files"按钮也有 `onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}`。虽然 `e.stopPropagation()` 阻止了冒泡，但两个点击目标指向同一个input，如果 `stopPropagation` 失败（极端情况），会触发两次文件选择对话框。
- **修复方案**：当前实现已用 `stopPropagation` 处理，风险极低。可以移除外层div的onClick，仅保留按钮的点击事件。

---

## 第四部分：兼容、性能、安全隐患

### C01 — Leaflet CSS缺失导致地图在所有浏览器中显示异常（同F04）
- **风险等级**：🔴 严重
- **详见**：F04

### C02 — `crypto.subtle` 在HTTP环境下不可用，SHA-256计算静默失败
- **风险等级**：🟡 中
- **文件**：`src/components/ExifRemover.tsx` L12-L22
- **问题**：代码已处理 `!crypto.subtle` 返回 null 的情况，但用户在HTTP环境下看不到SHA-256哈希值，没有任何提示说明为什么没有哈希值。用户可能认为功能有BUG。
- **修复方案**：当SHA-256不可用时显示提示信息（如"SHA-256需要HTTPS环境"）。

### C03 — heic2any库体积大（~150KB），即使用户不上传HEIC也会被加载
- **风险等级**：🟡 中（性能）
- **文件**：`src/lib/exif-cleaner.ts` L11
- **问题**：`import('heic2any')` 是动态导入，只在需要时加载，这是正确的。但heic2any内部依赖了较大的转换逻辑，首次加载可能需要数秒（弱网环境）。
- **修复方案**：当前实现已是动态导入，无需修改。可以考虑添加loading提示。

### C04 — 多图片顺序处理导致总耗时线性增长
- **风险等级**：🟡 中（性能）
- **文件**：`src/components/ExifRemover.tsx` L185-L187
- **问题**：`handleCleanAll` 使用 `for...of` + `await` 串行处理所有图片。10张图片每张1秒 = 10秒总耗时。用户期望批量处理应该更快。
- **修复方案**：使用 `Promise.all` 或限制并发数（如3个一批）并行处理。注意Canvas操作在主线程，完全并行可能导致UI卡顿，建议使用Web Worker或限制并发。

### C05 — ObjectURL在组件卸载时批量revoke，大量图片时可能卡顿
- **风险等级**：🟢 低（性能）
- **文件**：`src/components/ExifRemover.tsx` L40-L44
- **问题**：卸载时遍历所有photos调用 `URL.revokeObjectURL`，如果用户上传了100+张图片，这个循环在卸载时执行可能造成短暂卡顿。
- **修复方案**：在删除单个图片时立即revoke（已实现），卸载时的批量revoke仅作为安全网，影响不大。

### C06 — XSS风险：GPS地图popup内容未转义
- **风险等级**：🟡 中（安全）
- **文件**：`src/components/MetaPanel.tsx` L245
- **问题**：`bindPopup` 使用HTML字符串插值：`` `<strong>${t.tool.photoLocation}</strong><br/>${lat.toFixed(6)}, ${lng.toFixed(6)}` ``。虽然 `lat` 和 `lng` 是数字（`toFixed` 返回字符串但来源是 `parseFloat`），XSS风险极低。但如果EXIF数据被恶意构造（通过修改本地文件），理论上 `t.tool.photoLocation` 的翻译文本可能包含HTML。
- **修复方案**：使用Leaflet的DOM API创建popup内容，而非HTML字符串。

### C07 — EXIF标签值直接渲染到DOM，恶意EXIF数据可能包含HTML
- **风险等级**：🟡 中（安全）
- **文件**：`src/components/MetaPanel.tsx` L386, `src/components/PhotoGrid.tsx` L95
- **问题**：EXIF标签的 `tag.value` 和 `tag.label` 通过React的 `{tag.value}` 渲染，React默认转义HTML，所以实际XSS风险极低。但如果将来有人将渲染方式改为 `dangerouslySetInnerHTML`，就会引入XSS。
- **修复方案**：当前React的默认行为已提供保护，无需修改。建议在代码注释中标注此处依赖React的XSS防护。

### C08 — Content Security Policy未配置
- **风险等级**：🟡 中（安全）
- **文件**：`astro.config.mjs`, `src/layouts/BaseLayout.astro`
- **问题**：网站没有配置CSP头。虽然这是纯前端应用，但缺少CSP意味着：1) 如果第三方CDN被劫持，可以注入任意脚本；2) 内联脚本（Header.astro的script标签、CTA的script标签）需要 `unsafe-inline`。
- **修复方案**：在Astro配置或部署平台中添加CSP头，至少限制 `script-src` 和 `connect-src`。

### C09 — OpenStreetMap瓦片请求泄露用户IP和浏览的GPS坐标
- **风险等级**：🟢 低（隐私）
- **文件**：`src/components/MetaPanel.tsx` L233
- **问题**：加载地图瓦片时，浏览器会向OpenStreetMap服务器发送请求，暴露用户IP。虽然GPS坐标本身就在EXIF中，但这是额外的信息泄露点。
- **修复方案**：在地图加载前添加提示，告知用户地图瓦片由第三方提供。或提供"仅显示坐标不加载地图"选项。

### C10 — Safari中AVIF格式Canvas toBlob可能返回null
- **风险等级**：🟡 中（兼容）
- **文件**：`src/lib/exif-cleaner.ts` L87-L99
- **问题**：`getOutputFormat` 对AVIF返回JPEG输出，这是正确的（因为Canvas不支持AVIF编码）。但如果用户上传的AVIF文件在Safari中无法被 `<img>` 解码（Safari 16之前不支持AVIF），`img.onerror` 会触发，导致清理失败。
- **修复方案**：在 `isValidFile` 中添加浏览器格式支持检测，对不支持的格式提前提示。

### C11 — Firefox中HEIC文件MIME类型可能为空
- **风险等级**：🟡 中（兼容）
- **文件**：`src/components/DropZone.tsx` L22-L24, `src/lib/exif-cleaner.ts` L111
- **问题**：Firefox可能不会为HEIC文件设置正确的MIME类型（`file.type` 可能为空字符串），导致 `isValidFile` 的 `ACCEPTED_TYPES.has(file.type)` 检查失败。但 `ACCEPTED_EXTENSIONS` 正则检查可以兜底，所以实际影响有限。
- **修复方案**：当前实现已有扩展名兜底，无需修改。

### C12 — 移动端Safari中 `document.addEventListener('paste')` 不触发
- **风险等级**：🟢 低（兼容）
- **文件**：`src/components/DropZone.tsx` L97
- **问题**：iOS Safari不支持 `document` 级别的paste事件。用户在移动端无法通过粘贴上传图片。但移动端通常使用相册选择，影响有限。
- **修复方案**：在移动端隐藏"or paste from clipboard"提示，避免误导。

---

## 第五部分：页面细节优化清单 & 代码规范整改建议

### 页面细节优化清单

| # | 优化项 | 当前状态 | 建议 |
|---|--------|----------|------|
| 1 | 页面加载时无骨架屏/占位符 | 白屏直到React hydration完成 | 添加SSR友好的loading占位符 |
| 2 | 图片处理进度无百分比 | 只有spinner | 添加进度条或百分比显示 |
| 3 | 批量下载ZIP时无进度 | "Preparing..."无进度 | 添加ZIP生成进度条 |
| 4 | 搜索框无防抖 | 每次按键都触发过滤 | 添加300ms防抖 |
| 5 | 图片缩略图使用原始文件ObjectURL | 大文件缩略图加载慢 | 使用Canvas生成小尺寸缩略图 |
| 6 | 清理后文件自动下载无确认 | 直接下载 | 添加下载确认或提示 |
| 7 | 页面标题在多语言版本中格式不统一 | 英文`Free EXIF Remover — ...` vs 其他`EXIF Remover — ...` | 统一标题格式 |
| 8 | og:image使用SVG格式 | 社交媒体可能不支持SVG预览 | 改用PNG/JPG格式的og:image |
| 9 | favicon使用SVG格式 | 旧版Safari不支持SVG favicon | 添加ICO格式fallback |
| 10 | 内容页prev/next导航箭头硬编码 | `←` 和 `→` 在RTL语言中方向错误 | 使用翻译键或CSS逻辑属性 |
| 11 | Schema.org WebApplication name硬编码英文 | `"name": "EXIF Remover"` | 使用 `t.site.title` |
| 12 | BreadcrumbList schema中name硬编码英文 | `"name": "Home"`, `"name": "Learn"` | 使用 `t.breadcrumb.home/learn` |

### 代码规范整改建议

| # | 建议 | 涉及文件 | 说明 |
|---|------|----------|------|
| 1 | `formatBytes` 函数重复定义 | `PhotoGrid.tsx` L121-L124, `MetaPanel.tsx` L399-L402 | 提取到 `lib/format.ts` 共享 |
| 2 | `L.Map` 类型未导入 | `MetaPanel.tsx` L199 | 添加 `import type { Map as LMap } from 'leaflet'` 或使用 `any` |
| 3 | `PRESERVED_TAGS` 未在清理逻辑中使用 | `risk-map.ts` L64-L67 | 该Set已定义但从未被引用，要么使用它要么删除 |
| 4 | `isHighRisk` 函数未使用 | `risk-map.ts` L74-L76 | 该导出函数无任何调用方，属于死代码 |
| 5 | FAQ组件 `DEFAULT_FAQS` 与翻译系统重复 | `FAQ.tsx` L12-L33 | 移除DEFAULT_FAQS，强制要求传入items prop |
| 6 | `astro.config.mjs` 中 site 仍为占位符 | `astro.config.mjs` L7 | `https://example.com` 需要在上线前替换 |
| 7 | Error消息混合中英文 | `ExifRemover.tsx` L169-L171 | HEIC错误消息硬编码英文，应使用翻译键 |
| 8 | `handleCleanSingle` 的 `useCallback` 依赖为空数组 | `ExifRemover.tsx` L178 | 依赖 `photosRef` 和 `cleanFile`，虽然ref不需要作为依赖，但 `cleanFile` 是外部导入，应明确 |
| 9 | Leaflet地图实例在组件卸载时可能未正确清理 | `MetaPanel.tsx` L256-L261 | 如果 `import('leaflet')` 还在进行中时组件卸载，`mapInstanceRef.current` 仍为null，但import完成后会设置map，导致内存泄漏 |
| 10 | CSS变量未提供暗色主题值 | `global.css` L4-L16 | 所有颜色变量只有亮色值，`prefers-color-scheme: dark` 无效 |

---

## 汇总统计

| 维度 | 数量 | 致命 | 严重 | 中等 | 低 |
|------|------|------|------|------|-----|
| 致命崩溃级 | 4 | 2 | 1 | 1 | 0 |
| 业务逻辑 | 8 | 0 | 0 | 5 | 3 |
| UI/交互细节 | 15 | 0 | 0 | 2 | 13 |
| 兼容/性能/安全 | 12 | 0 | 1 | 6 | 5 |
| **合计** | **39** | **2** | **2** | **14** | **21** |

### 必须修复（上线阻塞）

1. **F03** — `crypto.randomUUID()` 在HTTP环境崩溃 → 添加fallback
2. **F01** — 超大图片内存溢出 → 添加文件大小限制
3. **F04/C01** — Leaflet CSS缺失 → 动态注入CSS
4. **F02** — HEIC转换失败无回退 → 添加try-catch

### 强烈建议修复

5. **L05** — After列RiskBadge硬编码low → 使用tag.riskLevel
6. **U07** — "Learn More"混合语言 → 添加完整翻译键
7. **L08** — FAQ默认内容与翻译不同步 → 统一内容
8. **C04** — Clean All串行处理慢 → 限制并发并行处理
9. **C08** — 缺少CSP → 配置安全头
10. **L07/规范6** — site占位符未替换 → 上线前必须修改
