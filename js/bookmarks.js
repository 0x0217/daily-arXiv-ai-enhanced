let bookmarkedPapers = [];
let currentFilteredBookmarks = [];
let currentBookmarkIndex = 0;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
  // 设置GitHub链接
  setGitHubLinks();

  initBookmarksPage();
  fetchGitHubStats();
});

// 初始化收藏页面
function initBookmarksPage() {
  loadBookmarkedPapers();
  renderBookmarkStats();
  renderBookmarks();
  initEventListeners();
}

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

// 获取GitHub统计数据
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

// 加载收藏的论文
function loadBookmarkedPapers() {
  const savedBookmarks = localStorage.getItem('bookmarkedPapers');
  if (savedBookmarks) {
    try {
      bookmarkedPapers = JSON.parse(savedBookmarks);
      currentFilteredBookmarks = [...bookmarkedPapers];
    } catch (error) {
      console.error('解析收藏论文失败:', error);
      bookmarkedPapers = [];
      currentFilteredBookmarks = [];
    }
  } else {
    bookmarkedPapers = [];
    currentFilteredBookmarks = [];
  }
}

// 渲染收藏统计
function renderBookmarkStats() {
  const totalBookmarks = bookmarkedPapers.length;
  const categories = new Set(bookmarkedPapers.map(paper =>
    Array.isArray(paper.category) ? paper.category[0] : paper.category
  )).size;

  // 计算本周收藏数量
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentBookmarks = bookmarkedPapers.filter(paper =>
    new Date(paper.bookmarkedAt) > oneWeekAgo
  ).length;

  document.getElementById('totalBookmarks').textContent = totalBookmarks;
  document.getElementById('totalCategories').textContent = categories;
  document.getElementById('recentBookmarks').textContent = recentBookmarks;

  // 更新类别筛选器
  updateCategoryFilter();
}

// 更新类别筛选器
function updateCategoryFilter() {
  const categoryFilter = document.getElementById('filterCategory');
  const categories = new Set();

  bookmarkedPapers.forEach(paper => {
    const category = Array.isArray(paper.category) ? paper.category[0] : paper.category;
    if (category) {
      categories.add(category);
    }
  });

  // 清除现有选项（除了"All Categories"）
  while (categoryFilter.children.length > 1) {
    categoryFilter.removeChild(categoryFilter.lastChild);
  }

  // 添加类别选项
  Array.from(categories).sort().forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
}

// 渲染收藏列表
function renderBookmarks() {
  const container = document.getElementById('bookmarksContainer');

  if (currentFilteredBookmarks.length === 0) {
    container.innerHTML = `
      <div class="empty-bookmarks">
        <div class="empty-icon">📚</div>
        <h3>No bookmarks yet</h3>
        <p>Start bookmarking papers you find interesting!</p>
        <a href="index.html" class="button primary">Browse Papers</a>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  container.className = 'paper-container';

  currentFilteredBookmarks.forEach((paper, index) => {
    const paperCard = document.createElement('div');
    paperCard.className = 'paper-card bookmark-card';
    paperCard.dataset.id = paper.id || paper.url;

    const categoryTags = Array.isArray(paper.category) ?
      paper.category.map(cat => `<span class="category-tag">${cat}</span>`).join('') :
      `<span class="category-tag">${paper.category}</span>`;

    const bookmarkedDate = new Date(paper.bookmarkedAt).toLocaleDateString();

    paperCard.innerHTML = `
      <div class="paper-card-index">${index + 1}</div>
      <div class="bookmark-badge" title="Bookmarked on ${bookmarkedDate}">⭐</div>
      <div class="paper-card-header">
        <h3 class="paper-card-title">${paper.title}</h3>
        <p class="paper-card-authors">${paper.authors}</p>
        <div class="paper-card-categories">
          ${categoryTags}
        </div>
      </div>
      <div class="paper-card-body">
        <p class="paper-card-summary">${paper.summary}</p>
        <div class="paper-card-footer">
          <span class="paper-card-date">Published: ${formatDate(paper.date)}</span>
          <span class="paper-card-bookmark-date">Bookmarked: ${bookmarkedDate}</span>
          <div class="bookmark-actions">
            <button class="remove-bookmark-btn" onclick="removeBookmark('${paper.id}', '${paper.date}')" title="Remove bookmark">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
              </svg>
            </button>
            <span class="paper-card-link">Details</span>
          </div>
        </div>
      </div>
    `;

    paperCard.addEventListener('click', (e) => {
      // 如果点击的是删除按钮，不打开详情
      if (e.target.closest('.remove-bookmark-btn')) {
        return;
      }
      currentBookmarkIndex = index;
      showPaperDetails(paper, index + 1);
    });

    container.appendChild(paperCard);
  });
}

// 移除收藏
function removeBookmark(paperId, paperDate) {
  const paperKey = `${paperId}-${paperDate}`;
  const index = bookmarkedPapers.findIndex(p => `${p.id}-${p.date}` === paperKey);

  if (index !== -1) {
    bookmarkedPapers.splice(index, 1);
    localStorage.setItem('bookmarkedPapers', JSON.stringify(bookmarkedPapers));

    // 更新筛选后的列表
    applyFilters();
    renderBookmarkStats();
    renderBookmarks();

    showNotification('Bookmark removed!', 'info');
  }
}

// 清除所有收藏
function clearAllBookmarks() {
  if (bookmarkedPapers.length === 0) {
    showNotification('No bookmarks to clear!', 'info');
    return;
  }

  if (confirm(`Are you sure you want to remove all ${bookmarkedPapers.length} bookmarks? This action cannot be undone.`)) {
    bookmarkedPapers = [];
    currentFilteredBookmarks = [];
    localStorage.setItem('bookmarkedPapers', JSON.stringify(bookmarkedPapers));

    renderBookmarkStats();
    renderBookmarks();

    showNotification('All bookmarks cleared!', 'success');
  }
}

// 导出收藏
function exportBookmarks() {
  if (bookmarkedPapers.length === 0) {
    showNotification('No bookmarks to export!', 'info');
    return;
  }

  const exportData = {
    exportDate: new Date().toISOString(),
    totalBookmarks: bookmarkedPapers.length,
    bookmarks: bookmarkedPapers.map(paper => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      url: paper.url,
      category: paper.category,
      summary: paper.summary,
      date: paper.date,
      bookmarkedAt: paper.bookmarkedAt
    }))
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `arxiv_bookmarks_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification('Bookmarks exported successfully!', 'success');
}

// 应用筛选器
function applyFilters() {
  const sortBy = document.getElementById('sortBy').value;
  const categoryFilter = document.getElementById('filterCategory').value;

  // 筛选类别
  let filtered = bookmarkedPapers;
  if (categoryFilter !== 'all') {
    filtered = bookmarkedPapers.filter(paper => {
      const category = Array.isArray(paper.category) ? paper.category[0] : paper.category;
      return category === categoryFilter;
    });
  }

  // 排序
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'bookmarkedAt':
        return new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt);
      case 'date':
        return new Date(b.date) - new Date(a.date);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'category':
        const catA = Array.isArray(a.category) ? a.category[0] : a.category;
        const catB = Array.isArray(b.category) ? b.category[0] : b.category;
        return catA.localeCompare(catB);
      default:
        return 0;
    }
  });

  currentFilteredBookmarks = filtered;
}

// 显示论文详情（复用主页面的逻辑）
function showPaperDetails(paper, paperIndex) {
  const modal = document.getElementById('paperModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  // 重置模态框的滚动位置
  modalBody.scrollTop = 0;

  // 在标题前添加索引号
  modalTitle.innerHTML = `<span class="paper-index-badge">${paperIndex}</span> ${paper.title}`;

  const categoryDisplay = Array.isArray(paper.category) ?
    paper.category.join(', ') : paper.category;

  const modalContent = `
    <div class="paper-details">
      <p><strong>Authors: </strong>${paper.authors}</p>
      <p><strong>Categories: </strong>${categoryDisplay}</p>
      <p><strong>Published: </strong>${formatDate(paper.date)}</p>
      <p><strong>Bookmarked: </strong>${formatDate(paper.bookmarkedAt)}</p>

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
            ${paper.summary}
          </div>
        </div>
        ` : `
        <div class="paper-summary-content">${paper.summary}</div>
        `}
      </div>

      <div class="paper-sections">
        ${paper.motivation ? `<div class="paper-section"><h4>Motivation</h4><p>${paper.motivation}</p></div>` : ''}
        ${paper.method ? `<div class="paper-section"><h4>Method</h4><p>${paper.method}</p></div>` : ''}
        ${paper.result ? `<div class="paper-section"><h4>Result</h4><p>${paper.result}</p></div>` : ''}
        ${paper.conclusion ? `<div class="paper-section"><h4>Conclusion</h4><p>${paper.conclusion}</p></div>` : ''}
      </div>

      ${paper.details ? `<h3>Abstract</h3><div class="original-abstract">${paper.details}</div>` : ''}

      <div class="bookmark-paper-actions">
        <button class="remove-bookmark-button" onclick="removeBookmark('${paper.id}', '${paper.date}')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
          </svg>
          Remove Bookmark
        </button>
      </div>
    </div>
  `;

  // Update modal content
  document.getElementById('modalBody').innerHTML = modalContent;
  document.getElementById('paperLink').href = paper.url;
  document.getElementById('pdfLink').href = paper.url.replace('abs', 'pdf');
  document.getElementById('htmlLink').href = paper.url.replace('abs', 'html');

  // Add event listeners for footer buttons
  const bookmarkButton = document.getElementById('bookmarkButton');
  const downloadPdfButton = document.getElementById('downloadPdfButton');
  const showPdfButton = document.getElementById('showPdfButton');

  if (bookmarkButton) {
    // In bookmarks page, this will always be a remove action
    bookmarkButton.addEventListener('click', () => {
      removeBookmark(paper.id, paper.date);
    });
  }

  if (downloadPdfButton) {
    downloadPdfButton.addEventListener('click', () => downloadPaper(paper));
  }

  if (showPdfButton) {
    showPdfButton.addEventListener('click', () => showPdfInModal(paper));
  }

  // Add tab functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const tab = e.target.getAttribute('data-tab');

      // Remove active class from all tabs and buttons
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

      // Add active class to clicked button and corresponding tab
      e.target.classList.add('active');
      document.getElementById(`${tab}-summary`).classList.add('active');
    });
  });

  // 更新论文位置信息
  const paperPosition = document.getElementById('paperPosition');
  if (paperPosition && currentFilteredBookmarks.length > 0) {
    paperPosition.textContent = `${currentBookmarkIndex + 1} / ${currentFilteredBookmarks.length}`;
  }

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// 关闭模态框
function closeModal() {
  const modal = document.getElementById('paperModal');
  const modalBody = document.getElementById('modalBody');

  // 重置模态框的滚动位置
  modalBody.scrollTop = 0;

  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Show PDF in modal
function showPdfInModal(paper) {
  const pdfUrl = paper.url.replace('abs', 'pdf');
  window.open(pdfUrl, '_blank');
}

// 下载论文PDF
function downloadPaper(paper) {
  // Generate filename with special prefix
  const safeTitle = paper.title
    .substring(0, 50)
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();

  const filename = `ArXiv-AI-${paper.id}_${safeTitle}.pdf`;
  const downloadUrl = paper.url.replace('abs', 'pdf');

  // Force download by fetching the PDF and creating a blob
  fetch(downloadUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      return response.blob();
    })
    .then(blob => {
      // Create blob URL and force download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';

      // Add to DOM, click, and clean up
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a short delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      // Show success notification
      if (typeof showNotification === 'function') {
        showNotification(`Download completed: ${filename}`, 'success');
      }
    })
    .catch(error => {
      console.error('Download failed:', error);
      // Fallback to simple link download if fetch fails
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (typeof showNotification === 'function') {
        showNotification(`Download started: ${filename}`, 'warning');
      }
    });
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
}

// 显示通知
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

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

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutNotification 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// 初始化事件监听器
function initEventListeners() {
  // 关闭模态框
  document.getElementById('closeModal').addEventListener('click', closeModal);

  // 模态框背景点击关闭
  document.querySelector('.paper-modal').addEventListener('click', (event) => {
    if (event.target === document.querySelector('.paper-modal')) {
      closeModal();
    }
  });

  // 筛选和排序
  document.getElementById('sortBy').addEventListener('change', () => {
    applyFilters();
    renderBookmarks();
  });

  document.getElementById('filterCategory').addEventListener('change', () => {
    applyFilters();
    renderBookmarks();
  });

  // 清除所有收藏
  document.getElementById('clearAllBookmarks').addEventListener('click', clearAllBookmarks);

  // 导出收藏
  document.getElementById('exportBookmarks').addEventListener('click', exportBookmarks);

  // 键盘事件
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const paperModal = document.getElementById('paperModal');
      if (paperModal.classList.contains('active')) {
        closeModal();
      }
    }
  });
}

// 简单的下载功能（复用主页面逻辑）
function downloadPaper(paper) {
  const pdfUrl = paper.url.replace('abs', 'pdf');
  const filename = `${paper.id}_${paper.title.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  const link = document.createElement('a');
  link.href = pdfUrl;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showNotification('Download started!', 'success');
}
