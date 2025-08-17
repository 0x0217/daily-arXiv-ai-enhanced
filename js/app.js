let currentDate = '';
let availableDates = [];
let currentView = 'grid'; // 'grid' 或 'list'
let currentCategory = 'all';
let paperData = {};
let flatpickrInstance = null;
let isRangeMode = false;
let activeAuthors = []; // 存储激活的作者
let userAuthors = []; // 存储用户的作者
let searchQuery = ''; // 存储搜索查询
let bookmarkedPapers = []; // 存储收藏的论文
let currentPaperIndex = 0; // 当前查看的论文索引
let currentFilteredPapers = []; // 当前过滤后的论文列表
let translationCache = {}; // 缓存翻译结果
let currentPaperData = null; // 当前显示的论文数据

// 清理旧的关键词设置
function cleanupOldKeywordSettings() {
  // 移除旧的关键词相关的localStorage项
  localStorage.removeItem('preferredKeywords');
  localStorage.removeItem('excludeKeywords');
}

// 加载收藏的论文
function loadBookmarkedPapers() {
  const savedBookmarks = localStorage.getItem('bookmarkedPapers');
  if (savedBookmarks) {
    try {
      bookmarkedPapers = JSON.parse(savedBookmarks);
    } catch (error) {
      console.error('解析收藏论文失败:', error);
      bookmarkedPapers = [];
    }
  } else {
    bookmarkedPapers = [];
  }
}

// 加载用户的作者设置
function loadUserAuthors() {
  const savedAuthors = localStorage.getItem('preferredAuthors');
  if (savedAuthors) {
    try {
      userAuthors = JSON.parse(savedAuthors);
      // 默认激活所有作者
      activeAuthors = [...userAuthors];
    } catch (error) {
      console.error('解析作者失败:', error);
      userAuthors = [];
      activeAuthors = [];
    }
  } else {
    userAuthors = [];
    activeAuthors = [];
  }

  renderAuthorTags();
}

// 设置搜索查询
function setSearchQuery(query) {
  searchQuery = query.toLowerCase().trim();
  renderPapers();
}

// 初始化搜索功能
function initSearchFunctionality() {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearch');

  if (!searchInput || !clearSearchBtn) return;

  // 搜索输入事件
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    setSearchQuery(query);

    // 显示/隐藏清除按钮
    clearSearchBtn.style.display = query ? 'flex' : 'none';
  });

  // 清除搜索
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    setSearchQuery('');
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
  });

  // Enter键搜索
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSearchQuery(searchInput.value.trim());
    }
  });
}

// 渲染作者标签
function renderAuthorTags() {
  const authorTagsElement = document.getElementById('authorTags');
  const authorContainer = document.querySelector('.author-label-container');

  if (!userAuthors || userAuthors.length === 0) {
    authorContainer.style.display = 'none';
    return;
  }

  authorContainer.style.display = 'flex';
  authorTagsElement.innerHTML = '';

  // 添加作者标签
  userAuthors.forEach(author => {
    const tagElement = document.createElement('span');
    tagElement.className = `category-button ${activeAuthors.includes(author) ? 'active' : ''}`;
    tagElement.dataset.author = author;
    tagElement.textContent = author;
    // 添加提示信息，解释作者匹配的范围
    tagElement.title = "匹配作者列表中的名字";

    tagElement.addEventListener('click', () => {
      toggleAuthorFilter(author);
    });

    authorTagsElement.appendChild(tagElement);

    // 添加出现动画后移除动画类
    if (!activeAuthors.includes(author)) {
      tagElement.classList.add('tag-appear');
      setTimeout(() => {
        tagElement.classList.remove('tag-appear');
      }, 300);
    }
  });

  // // 添加"清除全部"按钮和逻辑提示
  // if (activeAuthors.length > 0) {
  //   const logicIndicator = document.createElement('span');
  //   logicIndicator.className = 'logic-indicator';
  //   logicIndicator.textContent = 'SORT';
  //   // 添加提示信息，解释排序逻辑
  //   logicIndicator.title = "多个作者使用'或'逻辑，匹配任一作者的论文会被优先显示";
  //   authorTagsElement.appendChild(logicIndicator);

  //   const clearButton = document.createElement('span');
  //   clearButton.className = 'category-button clear-button';
  //   clearButton.textContent = 'Clear';
  //   clearButton.addEventListener('click', clearAllAuthors);
  //   authorTagsElement.appendChild(clearButton);
  // }
}

// 切换作者过滤
function toggleAuthorFilter(author) {
  const index = activeAuthors.indexOf(author);

  if (index === -1) {
    // 激活该作者
    activeAuthors.push(author);
  } else {
    // 取消激活该作者
    activeAuthors.splice(index, 1);
  }

  // 更新作者标签UI
  const authorTags = document.querySelectorAll('[data-author]');
  authorTags.forEach(tag => {
    if (tag.dataset.author === author) {
      // 先移除上一次可能的高亮动画
      tag.classList.remove('tag-highlight');

      // 添加/移除激活状态
      tag.classList.toggle('active', activeAuthors.includes(author));

      // 添加高亮动画
      setTimeout(() => {
        tag.classList.add('tag-highlight');
      }, 10);

      // 移除高亮动画
      setTimeout(() => {
        tag.classList.remove('tag-highlight');
      }, 1000);
    }
  });

  // 重新渲染论文列表
  renderPapers();
}

// 收藏论文
function toggleBookmark(paper) {
  const paperKey = `${paper.id}-${paper.date}`;
  const existingIndex = bookmarkedPapers.findIndex(p => `${p.id}-${p.date}` === paperKey);

  if (existingIndex === -1) {
    // 添加收藏
    const bookmarkData = {
      ...paper,
      bookmarkedAt: new Date().toISOString()
    };
    bookmarkedPapers.push(bookmarkData);
    showNotification('Paper bookmarked successfully!', 'success');
  } else {
    // 取消收藏
    bookmarkedPapers.splice(existingIndex, 1);
    showNotification('Bookmark removed!', 'info');
  }

  // 保存到 localStorage
  localStorage.setItem('bookmarkedPapers', JSON.stringify(bookmarkedPapers));

  // 更新按钮状态
  updateBookmarkButton(paper);
}

// 检查论文是否已收藏
function isBookmarked(paper) {
  const paperKey = `${paper.id}-${paper.date}`;
  return bookmarkedPapers.some(p => `${p.id}-${p.date}` === paperKey);
}

// 更新收藏按钮状态
function updateBookmarkButton(paper) {
  const bookmarkButton = document.querySelector('.bookmark-button');
  if (bookmarkButton) {
    const isBookmarkedPaper = isBookmarked(paper);
    bookmarkButton.classList.toggle('bookmarked', isBookmarkedPaper);
    bookmarkButton.title = isBookmarkedPaper ? 'Remove from bookmarks' : 'Add to bookmarks';
  }
}

// 下载论文PDF - Direct download with predefined filename
function downloadPaper(paper) {
  // Generate filename with special prefix
  const safeTitle = paper.title
    .substring(0, 50)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();

  const filename = `ArXiv-AI-${paper.id}_${safeTitle}.pdf`;
  const downloadUrl = paper.url.replace('abs', 'pdf');

  showNotification('Starting download...', 'info');

  fetch(downloadUrl, {
    method: 'GET',
    mode: 'cors',
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.blob();
  })
  .then(blob => {
    // Create blob URL and download
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the blob URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    showNotification(`Download completed: ${filename}`, 'success');
  })
  .catch(error => {
    console.error('Download failed:', error);
    // Fallback: open in new tab with a message
    showNotification('Direct download blocked by browser. Opening PDF in new tab...', 'warning');
    window.open(downloadUrl, '_blank');
  });
}



// 保存下载历史
function saveDownloadHistory(filename, format) {
  const downloadHistory = JSON.parse(localStorage.getItem('downloadHistory') || '[]');

  downloadHistory.unshift({
    filename,
    format,
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleDateString()
  });

  // 保留最近50次下载记录
  if (downloadHistory.length > 50) {
    downloadHistory.splice(50);
  }

  localStorage.setItem('downloadHistory', JSON.stringify(downloadHistory));
}

// 显示通知
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  // 添加样式
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 500;
    animation: slideInNotification 0.3s ease;
  `;

  // 添加到页面
  document.body.appendChild(notification);

  // 3秒后自动移除
  setTimeout(() => {
    notification.style.animation = 'slideOutNotification 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// 翻译文本
async function translateText(text, targetLang = 'zh') {
  const cacheKey = `${text}_${targetLang}`;

  // 检查缓存
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  try {
    // 使用 MyMemory 免费翻译 API (无需 API key)
    const encodedText = encodeURIComponent(text);
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|${targetLang}`);
    const data = await response.json();

    if (data.responseStatus === 200 && data.responseData) {
      const translation = data.responseData.translatedText;
      // 缓存翻译结果
      translationCache[cacheKey] = translation;
      // 保存到 localStorage
      localStorage.setItem('translationCache', JSON.stringify(translationCache));
      return translation;
    } else {
      throw new Error('Translation failed');
    }
  } catch (error) {
    console.error('Translation error:', error);
    // 如果翻译失败，返回原文
    return text;
  }
}

// 加载翻译缓存
function loadTranslationCache() {
  const savedCache = localStorage.getItem('translationCache');
  if (savedCache) {
    try {
      translationCache = JSON.parse(savedCache);
    } catch (error) {
      console.error('解析翻译缓存失败:', error);
      translationCache = {};
    }
  }
}

// 翻译论文摘要
async function translatePaperSummary(paper, targetLang = 'zh') {
  const summaryElement = document.querySelector('.paper-summary-content');
  const translateButton = document.querySelector('.translate-button');

  if (!summaryElement || !translateButton) return;

  // 显示加载状态
  translateButton.disabled = true;
  translateButton.innerHTML = `
    <svg class="loading-spinner" viewBox="0 0 24 24" width="20" height="20">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416" style="animation: spin 1s linear infinite;">
        <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
      </circle>
    </svg>
    Translating...
  `;

  try {
    // 翻译标题、摘要和各个部分
    const translatedTitle = await translateText(paper.title, targetLang);
    const translatedSummary = await translateText(paper.summary, targetLang);

    let translatedMotivation = '';
    let translatedMethod = '';
    let translatedResult = '';
    let translatedConclusion = '';
    let translatedAbstract = '';

    if (paper.motivation) {
      translatedMotivation = await translateText(paper.motivation, targetLang);
    }
    if (paper.method) {
      translatedMethod = await translateText(paper.method, targetLang);
    }
    if (paper.result) {
      translatedResult = await translateText(paper.result, targetLang);
    }
    if (paper.conclusion) {
      translatedConclusion = await translateText(paper.conclusion, targetLang);
    }
    if (paper.details) {
      translatedAbstract = await translateText(paper.details, targetLang);
    }

    // 将翻译结果保存到paper对象中，以便收藏时保存
    paper.translatedTitle = translatedTitle;
    paper.translatedSummary = translatedSummary;
    if (translatedMotivation) paper.translatedMotivation = translatedMotivation;
    if (translatedMethod) paper.translatedMethod = translatedMethod;
    if (translatedResult) paper.translatedResult = translatedResult;
    if (translatedConclusion) paper.translatedConclusion = translatedConclusion;
    if (translatedAbstract) paper.translatedAbstract = translatedAbstract;

    // 更新页面内容
    updatePaperDetailsWithTranslation(paper, {
      title: translatedTitle,
      summary: translatedSummary,
      motivation: translatedMotivation,
      method: translatedMethod,
      result: translatedResult,
      conclusion: translatedConclusion,
      abstract: translatedAbstract
    });

    // 更新按钮状态
    translateButton.disabled = false;
    translateButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="currentColor"/>
      </svg>
      Show Original
    `;

    // 切换按钮功能到显示原文
    translateButton.onclick = () => showOriginalContent(paper);

    showNotification('Translation completed!', 'success');
  } catch (error) {
    console.error('Translation failed:', error);
    translateButton.disabled = false;
    translateButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="currentColor"/>
      </svg>
      Translate
    `;
    showNotification('Translation failed. Please try again.', 'error');
  }
}

// 显示原始内容
function showOriginalContent(paper) {
  // 恢复原始标题显示
  const modalTitle = document.getElementById('modalTitle');
  const paperIndex = currentPaperIndex + 1;
  if (modalTitle) {
    modalTitle.innerHTML = `<span class="paper-index-badge">${paperIndex}</span> ${paper.title}`;
  }

  // 清除paper对象中的翻译数据（这样重新翻译时会重新获取）
  delete paper.translatedTitle;
  delete paper.translatedSummary;
  delete paper.translatedMotivation;
  delete paper.translatedMethod;
  delete paper.translatedResult;
  delete paper.translatedConclusion;
  delete paper.translatedAbstract;

  updatePaperDetailsWithTranslation(paper, {
    title: paper.title,
    summary: paper.summary,
    motivation: paper.motivation || '',
    method: paper.method || '',
    result: paper.result || '',
    conclusion: paper.conclusion || '',
    abstract: paper.details || ''
  });

  // Remove translation attributes
  const elementsToReset = [
    '.paper-summary-content',
    '.paper-section[data-section="motivation"] p',
    '.paper-section[data-section="method"] p',
    '.paper-section[data-section="result"] p',
    '.paper-section[data-section="conclusion"] p',
    '.original-abstract'
  ];

  elementsToReset.forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
      element.removeAttribute('data-translated');
    }
  });

  const translateButton = document.querySelector('.translate-button');
  if (translateButton) {
    translateButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="currentColor"/>
      </svg>
      Translate
`;
    translateButton.onclick = () => translatePaperSummary(paper);
  }
}

// 更新论文详情页面内容
function updatePaperDetailsWithTranslation(paper, translations) {
  const modalTitle = document.getElementById('modalTitle');
  const paperIndex = currentPaperIndex + 1;

  if (modalTitle) {
    modalTitle.innerHTML = `
      <span class="paper-index-badge">${paperIndex}</span>
      <div class="title-container">
        <div class="original-title">${paper.title}</div>
        <div class="translated-title">${translations.title}</div>
      </div>
    `;
  }

  // 更新各个部分的内容
  const summaryContent = document.querySelector('.paper-summary-content');
  if (summaryContent) {
    summaryContent.innerHTML = translations.summary;
    summaryContent.setAttribute('data-translated', 'true');
  }

  const motivationSection = document.querySelector('.paper-section[data-section="motivation"] p');
  if (motivationSection && translations.motivation) {
    motivationSection.innerHTML = translations.motivation;
    motivationSection.setAttribute('data-translated', 'true');
  }

  const methodSection = document.querySelector('.paper-section[data-section="method"] p');
  if (methodSection && translations.method) {
    methodSection.innerHTML = translations.method;
    methodSection.setAttribute('data-translated', 'true');
  }

  const resultSection = document.querySelector('.paper-section[data-section="result"] p');
  if (resultSection && translations.result) {
    resultSection.innerHTML = translations.result;
    resultSection.setAttribute('data-translated', 'true');
  }

  const conclusionSection = document.querySelector('.paper-section[data-section="conclusion"] p');
  if (conclusionSection && translations.conclusion) {
    conclusionSection.innerHTML = translations.conclusion;
    conclusionSection.setAttribute('data-translated', 'true');
  }

  const abstractSection = document.querySelector('.original-abstract');
  if (abstractSection && translations.abstract) {
    abstractSection.innerHTML = translations.abstract;
    abstractSection.setAttribute('data-translated', 'true');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();

  // 设置GitHub链接
  setGitHubLinks();

  fetchGitHubStats();

  // 加载用户关键词
  cleanupOldKeywordSettings();

  // 加载用户作者
  loadUserAuthors();

  // 加载收藏的论文
  loadBookmarkedPapers();

  // 初始化搜索功能
  initSearchFunctionality();

  // 加载翻译缓存
  loadTranslationCache();

  fetchAvailableDates().then(() => {
    if (availableDates.length > 0) {
      loadPapersByDate(availableDates[0]);
    }
  });
});

// 获取当前仓库信息
function getCurrentRepoInfo() {
  const currentUrl = window.location.hostname;
  let username = 'dw-dengwei'; // fallback
  let repoName = 'daily-arXiv-ai-enhanced'; // fallback

  // If running on GitHub Pages, extract repo info from URL
  if (currentUrl.includes('github.io')) {
    const parts = currentUrl.split('.');
    if (parts.length >= 2) {
      username = parts[0];
      const pathname = window.location.pathname;
      repoName = pathname.split('/')[1] || 'daily-arXiv-ai-enhanced';
    }
  }

  return { username, repoName };
}

// 设置GitHub链接
function setGitHubLinks() {
  const { username, repoName } = getCurrentRepoInfo();
  const repoUrl = `https://github.com/${username}/${repoName}`;

  // 更新header中的GitHub链接
  const githubRepoLink = document.getElementById('githubRepoLink');
  if (githubRepoLink) {
    githubRepoLink.href = repoUrl;
  }

  // 更新footer中的GitHub链接
  const githubFooterLink = document.getElementById('githubFooterLink');
  if (githubFooterLink) {
    githubFooterLink.href = repoUrl;
  }
}

async function fetchGitHubStats() {
  try {
    const { username, repoName } = getCurrentRepoInfo();
    const repoUrl = `https://api.github.com/repos/${username}/${repoName}`;

    const response = await fetch(repoUrl);
    const data = await response.json();
    const starCount = data.stargazers_count;
    const forkCount = data.forks_count;

    document.getElementById('starCount').textContent = starCount;
    document.getElementById('forkCount').textContent = forkCount;
  } catch (error) {
    console.error('获取GitHub统计数据失败:', error);
    document.getElementById('starCount').textContent = '?';
    document.getElementById('forkCount').textContent = '?';
  }
}

function initEventListeners() {
  // 日期选择器相关的事件监听
  const calendarButton = document.getElementById('calendarButton');
  calendarButton.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDatePicker();
  });

  const datePickerModal = document.querySelector('.date-picker-modal');
  datePickerModal.addEventListener('click', (event) => {
    if (event.target === datePickerModal) {
      toggleDatePicker();
    }
  });

  const datePickerContent = document.querySelector('.date-picker-content');
  datePickerContent.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.getElementById('dateRangeMode').addEventListener('change', toggleRangeMode);

  // 其他原有的事件监听器
  document.getElementById('closeModal').addEventListener('click', closeModal);

  document.querySelector('.paper-modal').addEventListener('click', (event) => {
    const modal = document.querySelector('.paper-modal');
    const pdfContainer = modal.querySelector('.pdf-container');

    // 如果点击的是模态框背景
    if (event.target === modal) {
      // 检查PDF是否处于放大状态
      if (pdfContainer && pdfContainer.classList.contains('expanded')) {
        // 如果PDF是放大的，先将其恢复正常大小
        const expandButton = modal.querySelector('.pdf-expand-btn');
        if (expandButton) {
          togglePdfSize(expandButton);
        }
        // 阻止事件继续传播，防止关闭整个模态框
        event.stopPropagation();
      } else {
        // 如果PDF不是放大状态，则关闭整个模态框
        closeModal();
      }
    }
  });

  // 添加键盘事件监听 - Esc 键关闭模态框，左右箭头键切换论文，R 键显示随机论文
  document.addEventListener('keydown', (event) => {
    // 检查是否有输入框或文本区域处于焦点状态
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    );

    if (event.key === 'Escape') {
      const paperModal = document.getElementById('paperModal');
      const datePickerModal = document.getElementById('datePickerModal');

      // 关闭论文模态框
      if (paperModal.classList.contains('active')) {
        closeModal();
      }
      // 关闭日期选择器模态框
      else if (datePickerModal.classList.contains('active')) {
        toggleDatePicker();
      }
    }
    // 左右箭头键导航论文（仅在论文模态框打开时）
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const paperModal = document.getElementById('paperModal');
      if (paperModal.classList.contains('active')) {
        event.preventDefault(); // 防止页面滚动

        if (event.key === 'ArrowLeft') {
          navigateToPreviousPaper();
        } else if (event.key === 'ArrowRight') {
          navigateToNextPaper();
        }
      }
    }
    // space 键显示随机论文（在没有输入框焦点且日期选择器未打开时）
    else if (event.key === ' ' || event.key === 'Spacebar') {
      const paperModal = document.getElementById('paperModal');
      const datePickerModal = document.getElementById('datePickerModal');

      // 只有在没有输入框焦点且日期选择器没有打开时才触发
      // 现在允许在论文模态框打开时也能使用R键切换到随机论文
      if (!isInputFocused && !datePickerModal.classList.contains('active')) {
        event.preventDefault(); // 防止页面刷新
        event.stopPropagation(); // 阻止事件冒泡
        showRandomPaper();
      }
    }
  });

  // 添加鼠标滚轮横向滚动支持
  const categoryScroll = document.querySelector('.category-scroll');
  const keywordScroll = document.querySelector('.keyword-scroll');
  const authorScroll = document.querySelector('.author-scroll');

  // 为类别滚动添加鼠标滚轮事件
  if (categoryScroll) {
    categoryScroll.addEventListener('wheel', function(e) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.scrollLeft += e.deltaY;
      }
    });
  }

  // 为关键词滚动添加鼠标滚轮事件
  if (keywordScroll) {
    keywordScroll.addEventListener('wheel', function(e) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.scrollLeft += e.deltaY;
      }
    });
  }

  // 为作者滚动添加鼠标滚轮事件
  if (authorScroll) {
    authorScroll.addEventListener('wheel', function(e) {
      if (e.deltaY !== 0) {
        e.preventDefault();
        this.scrollLeft += e.deltaY;
      }
    });
  }

  // Navigation button event listeners
  const prevPaperButton = document.getElementById('prevPaperButton');
  const nextPaperButton = document.getElementById('nextPaperButton');

  if (prevPaperButton) {
    prevPaperButton.addEventListener('click', () => {
      navigateToPreviousPaper();
    });
  }

  if (nextPaperButton) {
    nextPaperButton.addEventListener('click', () => {
      navigateToNextPaper();
    });
  }

  // 其他事件监听器...
  const categoryButtons = document.querySelectorAll('.category-button');
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      const category = button.dataset.category;
      filterByCategory(category);
    });
  });
}

// Helper function to determine which AI enhanced file language is available for a date
// This function is language-agnostic and will work with any language (Chinese, Korean, English, etc.)
function getAIEnhancedLanguage(date, fileList) {
  // Look for any AI enhanced file for the given date
  const aiEnhancedFile = fileList.find(file =>
    file.startsWith(`${date}_AI_enhanced_`) && file.endsWith('.jsonl')
  );

  if (aiEnhancedFile) {
    // Extract language from filename: date_AI_enhanced_LANGUAGE.jsonl
    const match = aiEnhancedFile.match(/_AI_enhanced_(.+)\.jsonl$/);
    return match ? match[1] : null;
  }

  return null;
}

// Global variable to store available file info (date -> language mapping)
// Supports any language dynamically (Chinese, Korean, English, Spanish, etc.)
let availableDateFiles = {};

async function fetchAvailableDates() {
  try {
    const response = await fetch('assets/file-list.txt');
    if (!response.ok) {
      console.error('Error fetching file list:', response.status);
      return [];
    }
    const text = await response.text();
    const files = text.trim().split('\n');

    const dateRegex = /(\d{4}-\d{2}-\d{2})_AI_enhanced_(.+)\.jsonl/;
    const dates = [];
    availableDateFiles = {}; // Reset the file mapping

    files.forEach(file => {
      const match = file.match(dateRegex);
      if (match && match[1] && match[2]) {
        const date = match[1];
        const language = match[2];
        dates.push(date);
        availableDateFiles[date] = language;
      }
    });
    availableDates = [...new Set(dates)];
    availableDates.sort((a, b) => new Date(b) - new Date(a));

    initDatePicker(); // Assuming this function uses availableDates

    return availableDates;
  } catch (error) {
    console.error('获取可用日期失败:', error);
  }
}

function initDatePicker() {
  const datepickerInput = document.getElementById('datepicker');

  if (flatpickrInstance) {
    flatpickrInstance.destroy();
  }

  // 创建可用日期的映射，用于禁用无效日期
  const enabledDatesMap = {};
  availableDates.forEach(date => {
    enabledDatesMap[date] = true;
  });

  // 配置 Flatpickr
  flatpickrInstance = flatpickr(datepickerInput, {
    inline: true,
    dateFormat: "Y-m-d",
    defaultDate: availableDates[0],
    enable: [
      function(date) {
        // 只启用有效日期
        const dateStr = date.getFullYear() + "-" +
                        String(date.getMonth() + 1).padStart(2, '0') + "-" +
                        String(date.getDate()).padStart(2, '0');
        return !!enabledDatesMap[dateStr];
      }
    ],
    onChange: function(selectedDates, dateStr) {
      if (isRangeMode && selectedDates.length === 2) {
        // 处理日期范围选择
        const startDate = formatDateForAPI(selectedDates[0]);
        const endDate = formatDateForAPI(selectedDates[1]);
        loadPapersByDateRange(startDate, endDate);
        toggleDatePicker();
      } else if (!isRangeMode && selectedDates.length === 1) {
        // 处理单个日期选择
        const selectedDate = formatDateForAPI(selectedDates[0]);
        if (availableDates.includes(selectedDate)) {
          loadPapersByDate(selectedDate);
          toggleDatePicker();
        }
      }
    }
  });

  // 隐藏日期输入框
  const inputElement = document.querySelector('.flatpickr-input');
  if (inputElement) {
    inputElement.style.display = 'none';
  }
}

function formatDateForAPI(date) {
  return date.getFullYear() + "-" +
         String(date.getMonth() + 1).padStart(2, '0') + "-" +
         String(date.getDate()).padStart(2, '0');
}

function toggleRangeMode() {
  isRangeMode = document.getElementById('dateRangeMode').checked;

  if (flatpickrInstance) {
    flatpickrInstance.set('mode', isRangeMode ? 'range' : 'single');
  }
}

async function loadPapersByDate(date) {
  currentDate = date;
  document.getElementById('currentDate').textContent = formatDate(date);

  // 更新日期选择器中的选中日期
  if (flatpickrInstance) {
    flatpickrInstance.setDate(date, false);
  }

  // 不再重置激活的关键词和作者
  // 而是保持当前选择状态

  const container = document.getElementById('paperContainer');
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading paper...</p>
    </div>
  `;

  try {
    const language = availableDateFiles[date] || 'Chinese';
    const response = await fetch(`data/${date}_AI_enhanced_${language}.jsonl`);
    const text = await response.text();

    paperData = parseJsonlData(text, date);

    const categories = getAllCategories(paperData);

    renderCategoryFilter(categories);

    renderPapers();
  } catch (error) {
    console.error('加载论文数据失败:', error);
    container.innerHTML = `
      <div class="loading-container">
        <p>Loading data fails. Please retry.</p>
        <p>Error messages: ${error.message}</p>
      </div>
    `;
  }
}

function parseJsonlData(jsonlText, date) {
  const result = {};

  const lines = jsonlText.trim().split('\n');

  lines.forEach(line => {
    try {
      const paper = JSON.parse(line);

      if (!paper.categories) {
        return;
      }

      let allCategories = Array.isArray(paper.categories) ? paper.categories : [paper.categories];

      const primaryCategory = allCategories[0];

      if (!result[primaryCategory]) {
        result[primaryCategory] = [];
      }

      const summary = paper.AI && paper.AI.tldr ? paper.AI.tldr : paper.summary;

      result[primaryCategory].push({
        title: paper.title,
        url: paper.abs || paper.pdf || `https://arxiv.org/abs/${paper.id}`,
        authors: Array.isArray(paper.authors) ? paper.authors.join(', ') : paper.authors,
        category: allCategories,
        summary: summary,
        details: paper.summary || '',
        translatedSummary: paper.AI && paper.AI.translated_summary ? paper.AI.translated_summary : '',
        date: date,
        id: paper.id,
        motivation: paper.AI && paper.AI.motivation ? paper.AI.motivation : '',
        method: paper.AI && paper.AI.method ? paper.AI.method : '',
        result: paper.AI && paper.AI.result ? paper.AI.result : '',
        conclusion: paper.AI && paper.AI.conclusion ? paper.AI.conclusion : ''
      });
    } catch (error) {
      console.error('解析JSON行失败:', error, line);
    }
  });

  return result;
}

// 获取所有类别并按偏好排序
function getAllCategories(data) {
  const categories = Object.keys(data);
  const catePaperCount = {};

  categories.forEach(category => {
    catePaperCount[category] = data[category] ? data[category].length : 0;
  });

  return {
    sortedCategories: categories.sort((a, b) => {
      return a.localeCompare(b);
    }),
    categoryCounts: catePaperCount
  };
}

function renderCategoryFilter(categories) {
  const container = document.querySelector('.category-scroll');
  const { sortedCategories, categoryCounts } = categories;

  let totalPapers = 0;
  Object.values(categoryCounts).forEach(count => {
    totalPapers += count;
  });

  container.innerHTML = `
    <button class="category-button ${currentCategory === 'all' ? 'active' : ''}" data-category="all">All<span class="category-count">${totalPapers}</span></button>
  `;

  sortedCategories.forEach(category => {
    const count = categoryCounts[category];
    const button = document.createElement('button');
    button.className = `category-button ${category === currentCategory ? 'active' : ''}`;
    button.innerHTML = `${category}<span class="category-count">${count}</span>`;
    button.dataset.category = category;
    button.addEventListener('click', () => {
      filterByCategory(category);
    });

    container.appendChild(button);
  });

  document.querySelector('.category-button[data-category="all"]').addEventListener('click', () => {
    filterByCategory('all');
  });
}

function filterByCategory(category) {
  currentCategory = category;

  document.querySelectorAll('.category-button').forEach(button => {
    button.classList.toggle('active', button.dataset.category === category);
  });

  // 保持当前激活的关键词
  renderKeywordTags();

  // 保持当前激活的作者
  renderAuthorTags();

  renderPapers();
}

// 帮助函数：高亮文本中的匹配内容
function highlightMatches(text, terms, className = 'highlight-match') {
  if (!terms || terms.length === 0 || !text) {
    return text;
  }

  let result = text;

  // 按照长度排序关键词，从长到短，避免短词先替换导致长词匹配失败
  const sortedTerms = [...terms].sort((a, b) => b.length - a.length);

  // 为每个词创建一个正则表达式，使用 'gi' 标志进行全局、不区分大小写的匹配
  sortedTerms.forEach(term => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(regex, `<span class="${className}">$1</span>`);
  });

  return result;
}

function renderPapers() {
  const container = document.getElementById('paperContainer');
  container.innerHTML = '';
  container.className = `paper-container ${currentView === 'list' ? 'list-view' : ''}`;

  let papers = [];
  if (currentCategory === 'all') {
    const { sortedCategories } = getAllCategories(paperData);
    sortedCategories.forEach(category => {
      if (paperData[category]) {
        papers = papers.concat(paperData[category]);
      }
    });
  } else if (paperData[currentCategory]) {
    papers = paperData[currentCategory];
  }

  // 创建匹配论文的集合
  let filteredPapers = [...papers];

  // 应用搜索过滤
  if (searchQuery) {
    filteredPapers = filteredPapers.filter(paper => {
      const titleText = paper.title.toLowerCase();
      return titleText.includes(searchQuery);
    });
  }

  // 作者匹配，但不过滤，只排序
  if (activeAuthors.length > 0) {
    // 对论文进行排序，将匹配的论文放在前面
    filteredPapers.sort((a, b) => {
      const aMatchesAuthor = activeAuthors.some(author => {
        // 仅在作者中搜索作者名
        return a.authors.toLowerCase().includes(author.toLowerCase());
      });

      const bMatchesAuthor = activeAuthors.some(author => {
        // 仅在作者中搜索作者名
        return b.authors.toLowerCase().includes(author.toLowerCase());
      });

      if (aMatchesAuthor && !bMatchesAuthor) return -1;
      if (!aMatchesAuthor && bMatchesAuthor) return 1;
      return 0;
    });

    // 标记匹配的论文
    filteredPapers.forEach(paper => {
      const matchesAuthor = activeAuthors.length > 0 ?
        activeAuthors.some(author => {
          return paper.authors.toLowerCase().includes(author.toLowerCase());
        }) : false;

      // 添加匹配标记（用于后续高亮整个论文卡片）
      paper.isMatched = matchesAuthor;

      // 添加匹配原因（用于显示匹配提示）
      if (paper.isMatched) {
        paper.matchReason = [];
        const matchedAuthors = activeAuthors.filter(author =>
          paper.authors.toLowerCase().includes(author.toLowerCase())
        );
        if (matchedAuthors.length > 0) {
          paper.matchReason.push(`作者: ${matchedAuthors.join(', ')}`);
        }
      }
    });
  }

  // 存储当前过滤后的论文列表，用于箭头键导航
  currentFilteredPapers = [...filteredPapers];

  if (filteredPapers.length === 0) {
    container.innerHTML = `
      <div class="loading-container">
        <p>No paper found.</p>
      </div>
    `;
    return;
  }

  filteredPapers.forEach((paper, index) => {
    const paperCard = document.createElement('div');
    // 添加匹配高亮类
    paperCard.className = `paper-card ${paper.isMatched ? 'matched-paper' : ''}`;
    paperCard.dataset.id = paper.id || paper.url;

    if (paper.isMatched) {
      // 添加匹配原因提示
      paperCard.title = `匹配: ${paper.matchReason.join(' | ')}`;
    }

    const categoryTags = paper.allCategories ?
      paper.allCategories.map(cat => `<span class="category-tag">${cat}</span>`).join('') :
      `<span class="category-tag">${paper.category}</span>`;

    // 标题和摘要（不再高亮关键词）
    const highlightedTitle = paper.title;
    const highlightedSummary = paper.summary;

    // 高亮作者中的匹配
    const highlightedAuthors = activeAuthors.length > 0
      ? highlightMatches(paper.authors, activeAuthors, 'author-highlight')
      : paper.authors;

    paperCard.innerHTML = `
      <div class="paper-card-index">${index + 1}</div>
      ${paper.isMatched ? '<div class="match-badge" title="匹配您的搜索条件"></div>' : ''}
      <div class="paper-card-header">
        <h3 class="paper-card-title">${highlightedTitle}</h3>
        <p class="paper-card-authors">${highlightedAuthors}</p>
        <div class="paper-card-categories">
          ${categoryTags}
        </div>
      </div>
      <div class="paper-card-body">
        <p class="paper-card-summary">${highlightedSummary}</p>
        <div class="paper-card-footer">
          <span class="paper-card-date">${formatDate(paper.date)}</span>
          <span class="paper-card-link">Details</span>
        </div>
      </div>
    `;

    paperCard.addEventListener('click', () => {
      currentPaperIndex = index; // 记录当前点击的论文索引
      showPaperDetails(paper, index + 1);
    });

    container.appendChild(paperCard);
  });
}

function showPaperDetails(paper, paperIndex) {
  const modal = document.getElementById('paperModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const paperLink = document.getElementById('paperLink');
  const pdfLink = document.getElementById('pdfLink');
  const htmlLink = document.getElementById('htmlLink');

  // 存储当前论文数据
  currentPaperData = paper;

  // 重置模态框的滚动位置
  modalBody.scrollTop = 0;

  // 高亮标题中的关键词
  const highlightedTitle = paper.title;

  // 在标题前添加索引号
  modalTitle.innerHTML = paperIndex ? `<span class="paper-index-badge">${paperIndex}</span> ${highlightedTitle}` : highlightedTitle;

  const abstractText = paper.details || '';

  const categoryDisplay = paper.allCategories ?
    paper.allCategories.join(', ') :
    paper.category;

  // 高亮作者中的匹配
  const highlightedAuthors = activeAuthors.length > 0
    ? highlightMatches(paper.authors, activeAuthors, 'author-highlight')
    : paper.authors;

  // 移除关键词高亮，使用原始内容
  const highlightedSummary = paper.summary;
  const highlightedAbstract = abstractText;
  const highlightedMotivation = paper.motivation;
  const highlightedMethod = paper.method;
  const highlightedResult = paper.result;
  const highlightedConclusion = paper.conclusion;

  // 判断是否需要显示高亮说明
  const showHighlightLegend = activeAuthors.length > 0;

  // 添加匹配标记
  const matchedPaperClass = paper.isMatched ? 'matched-paper-details' : '';

  const modalContent = `
    <div class="paper-details ${matchedPaperClass}">
      <p><strong>Authors: </strong>${highlightedAuthors}</p>
      <p><strong>Categories: </strong>${categoryDisplay}</p>
      <p><strong>Date: </strong>${formatDate(paper.date)}</p>



      <h3>TL;DR</h3>
      <div class="summary-tabs">
        ${paper.translatedSummary ? `
        <div class="tab-buttons">
          <button class="tab-button active" data-tab="translated">Translated</button>
          <button class="tab-button" data-tab="original">Original</button>
        </div>
        <div class="tab-content">
          <div class="tab-pane active" id="translated-summary">
            ${paper.translatedSummary}
          </div>
          <div class="tab-pane" id="original-summary">
            ${highlightedAbstract || highlightedSummary}
          </div>
        </div>
        ` : `
        <div class="paper-summary-content">${highlightedSummary}</div>
        `}
      </div>

      <div class="paper-sections">
        ${paper.motivation ? `<div class="paper-section" data-section="motivation"><h4>Motivation</h4><p>${highlightedMotivation}</p></div>` : ''}
        ${paper.method ? `<div class="paper-section" data-section="method"><h4>Method</h4><p>${highlightedMethod}</p></div>` : ''}
        ${paper.result ? `<div class="paper-section" data-section="result"><h4>Result</h4><p>${highlightedResult}</p></div>` : ''}
        ${paper.conclusion ? `<div class="paper-section" data-section="conclusion"><h4>Conclusion</h4><p>${highlightedConclusion}</p></div>` : ''}
      </div>

      ${highlightedAbstract ? `<h3>Abstract</h3><div class="original-abstract">${highlightedAbstract}</div>` : ''}




    </div>
  `;

  // Update modal content
  document.getElementById('modalBody').innerHTML = modalContent;
  document.getElementById('paperLink').href = paper.url;
  document.getElementById('pdfLink').href = paper.url.replace('abs', 'pdf');
  document.getElementById('htmlLink').href = paper.url.replace('abs', 'html');

        // Add event listeners to the action buttons
  const bookmarkButton = document.getElementById('bookmarkButton');
  const downloadPdfButton = document.getElementById('downloadPdfButton');

    if (bookmarkButton) {
    // Remove any existing event listeners to prevent multiple actions
    bookmarkButton.replaceWith(bookmarkButton.cloneNode(true));
    const newBookmarkButton = document.getElementById('bookmarkButton');

    // Update bookmark button appearance based on current state
    const isBookmarkedPaper = isBookmarked(paper);
    newBookmarkButton.title = isBookmarkedPaper ? 'Remove from bookmarks' : 'Add to bookmarks';
    const bookmarkIcon = newBookmarkButton.querySelector('path');
    if (bookmarkIcon) {
      bookmarkIcon.setAttribute('fill', isBookmarkedPaper ? '#ffd700' : 'none');
    }

    // Store paper data as data attributes to avoid closure issues
    newBookmarkButton.setAttribute('data-paper', JSON.stringify(paper));
    newBookmarkButton.addEventListener('click', (e) => {
      const currentPaper = JSON.parse(e.target.closest('button').getAttribute('data-paper'));
      toggleBookmark(currentPaper);
      // Update button appearance after toggle
      const newIsBookmarked = isBookmarked(currentPaper);
      newBookmarkButton.title = newIsBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks';
      const icon = newBookmarkButton.querySelector('path');
      if (icon) {
        icon.setAttribute('fill', newIsBookmarked ? '#ffd700' : 'none');
      }
    });
  }

  if (downloadPdfButton) {
    // Remove any existing event listeners to prevent multiple downloads
    downloadPdfButton.replaceWith(downloadPdfButton.cloneNode(true));
    const newDownloadButton = document.getElementById('downloadPdfButton');
    // Store paper data as data attributes to avoid closure issues
    newDownloadButton.setAttribute('data-paper', JSON.stringify(paper));
    newDownloadButton.addEventListener('click', (e) => {
      const currentPaper = JSON.parse(e.target.closest('button').getAttribute('data-paper'));
      downloadPaper(currentPaper);
    });
  }



  // Add tab functionality - only if tabs exist and don't already have listeners
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    // Remove existing listeners by cloning
    const newButton = button.cloneNode(true);
    button.replaceWith(newButton);

    newButton.addEventListener('click', (e) => {
      const tab = e.target.getAttribute('data-tab');

      // Remove active class from all tabs and buttons
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked button and corresponding tab
      e.target.classList.add('active');
      document.getElementById(`${tab}-summary`).classList.add('active');
    });
  });

  // Removed Kimi chat integration

    // 更新论文位置信息
  const paperPosition = document.getElementById('paperPosition');
  if (paperPosition && currentFilteredPapers.length > 0) {
    paperPosition.textContent = `${currentPaperIndex + 1} / ${currentFilteredPapers.length}`;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('paperModal');
  const modalBody = document.getElementById('modalBody');

  // 重置模态框的滚动位置
  modalBody.scrollTop = 0;

  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Show PDF in modal


// 导航到上一篇论文
function navigateToPreviousPaper() {
  if (currentFilteredPapers.length === 0) {
    console.log('No filtered papers available for navigation');
    return;
  }

  const oldIndex = currentPaperIndex;
  currentPaperIndex = currentPaperIndex > 0 ? currentPaperIndex - 1 : currentFilteredPapers.length - 1;
  const paper = currentFilteredPapers[currentPaperIndex];
  console.log(`Navigating from ${oldIndex + 1} to ${currentPaperIndex + 1} of ${currentFilteredPapers.length}`);
  showPaperDetails(paper, currentPaperIndex + 1);
}

// 导航到下一篇论文
function navigateToNextPaper() {
  if (currentFilteredPapers.length === 0) {
    console.log('No filtered papers available for navigation');
    return;
  }

  const oldIndex = currentPaperIndex;
  currentPaperIndex = currentPaperIndex < currentFilteredPapers.length - 1 ? currentPaperIndex + 1 : 0;
  const paper = currentFilteredPapers[currentPaperIndex];
  console.log(`Navigating from ${oldIndex + 1} to ${currentPaperIndex + 1} of ${currentFilteredPapers.length}`);
  showPaperDetails(paper, currentPaperIndex + 1);
}

// 显示随机论文
function showRandomPaper() {
  // 检查是否有可用的论文
  if (currentFilteredPapers.length === 0) {
    console.log('No papers available to show random paper');
    return;
  }

  // 生成随机索引
  const randomIndex = Math.floor(Math.random() * currentFilteredPapers.length);
  const randomPaper = currentFilteredPapers[randomIndex];

  // 更新当前论文索引
  currentPaperIndex = randomIndex;

  // 显示随机论文
  showPaperDetails(randomPaper, currentPaperIndex + 1);

  // 显示随机论文指示器
  showRandomPaperIndicator();

  console.log(`Showing random paper: ${randomIndex + 1}/${currentFilteredPapers.length}`);
}

// 显示随机论文指示器
function showRandomPaperIndicator() {
  // 移除已存在的指示器
  const existingIndicator = document.querySelector('.random-paper-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  // 创建新的指示器
  const indicator = document.createElement('div');
  indicator.className = 'random-paper-indicator';
  indicator.textContent = 'Random Paper';

  // 添加到页面
  document.body.appendChild(indicator);

  // 3秒后自动移除
  setTimeout(() => {
    if (indicator && indicator.parentNode) {
      indicator.remove();
    }
  }, 3000);
}

function toggleDatePicker() {
  const datePicker = document.getElementById('datePickerModal');
  datePicker.classList.toggle('active');

  if (datePicker.classList.contains('active')) {
    document.body.style.overflow = 'hidden';

    // 重新初始化日期选择器以确保它反映最新的可用日期
    if (flatpickrInstance) {
      flatpickrInstance.setDate(currentDate, false);
    }
  } else {
    document.body.style.overflow = '';
  }
}

function toggleView() {
  currentView = currentView === 'grid' ? 'list' : 'grid';
  document.getElementById('paperContainer').classList.toggle('list-view', currentView === 'list');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

async function loadPapersByDateRange(startDate, endDate) {
  // 获取日期范围内的所有有效日期
  const validDatesInRange = availableDates.filter(date => {
    return date >= startDate && date <= endDate;
  });

  if (validDatesInRange.length === 0) {
    alert('No available papers in the selected date range.');
    return;
  }

  currentDate = `${startDate} to ${endDate}`;
  document.getElementById('currentDate').textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;

  // 不再重置激活的关键词和作者
  // 而是保持当前选择状态

  const container = document.getElementById('paperContainer');
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading papers from ${formatDate(startDate)} to ${formatDate(endDate)}...</p>
    </div>
  `;

  try {
    // 加载所有日期的论文数据
    const allPaperData = {};

    for (const date of validDatesInRange) {
      const language = availableDateFiles[date];
      if (!language) {
        console.warn(`No AI enhanced file found for date: ${date}, skipping...`);
        continue;
      }
      const response = await fetch(`data/${date}_AI_enhanced_${language}.jsonl`);
      const text = await response.text();
      const dataPapers = parseJsonlData(text, date);

      // 合并数据
      Object.keys(dataPapers).forEach(category => {
        if (!allPaperData[category]) {
          allPaperData[category] = [];
        }
        allPaperData[category] = allPaperData[category].concat(dataPapers[category]);
      });
    }

    paperData = allPaperData;

    const categories = getAllCategories(paperData);

    renderCategoryFilter(categories);

    renderPapers();
  } catch (error) {
    console.error('加载论文数据失败:', error);
    container.innerHTML = `
      <div class="loading-container">
        <p>Loading data fails. Please retry.</p>
        <p>Error messages: ${error.message}</p>
      </div>
    `;
  }
}

// 清除所有激活的关键词
function clearAllKeywords() {
  activeKeywords = [];
  renderKeywordTags();
  // 重新渲染论文列表，移除关键词匹配的高亮和优先排序
  renderPapers();
}

// 清除所有作者过滤
function clearAllAuthors() {
  activeAuthors = [];
  renderAuthorTags();
  // 重新渲染论文列表，移除作者匹配的高亮和优先排序
  renderPapers();
}

// 切换PDF预览器大小
function togglePdfSize(button) {
  const pdfContainer = button.closest('.pdf-preview-section').querySelector('.pdf-container');
  const iframe = pdfContainer.querySelector('iframe');
  const expandIcon = button.querySelector('.expand-icon');
  const collapseIcon = button.querySelector('.collapse-icon');

  if (pdfContainer.classList.contains('expanded')) {
    // 恢复正常大小
    pdfContainer.classList.remove('expanded');
    iframe.style.height = '800px';
    expandIcon.style.display = 'block';
    collapseIcon.style.display = 'none';

    // 移除遮罩层
    const overlay = document.querySelector('.pdf-overlay');
    if (overlay) {
      overlay.remove();
    }
  } else {
    // 放大显示
    pdfContainer.classList.add('expanded');
    iframe.style.height = '90vh';
    expandIcon.style.display = 'none';
    collapseIcon.style.display = 'block';

    // 添加遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'pdf-overlay';
    document.body.appendChild(overlay);

    // 点击遮罩层时收起PDF
    overlay.addEventListener('click', () => {
      togglePdfSize(button);
    });
  }
}