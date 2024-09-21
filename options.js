document.addEventListener('DOMContentLoaded', () => {
    const dailyLimitInput = document.getElementById('dailyLimit');
    const categoriesDiv = document.getElementById('categories');
    const addCategoryBtn = document.getElementById('addCategory');
    const retentionPeriodInput = document.getElementById('retentionPeriod');
    const saveBtn = document.getElementById('save');
    const statusDiv = document.getElementById('status');
  
    // Load saved options
    chrome.storage.sync.set({
        dailyLimit: dailyLimit,
        categories: categories,
        retentionPeriod: retentionPeriod
      }, () => {
        if (chrome.runtime.lastError) {
          statusDiv.textContent = 'Error saving options: ' + chrome.runtime.lastError.message;
          statusDiv.className = 'error';
        } else {
          statusDiv.textContent = 'Options saved.';
          statusDiv.className = 'success';
          setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
          }, 3000);
        }
      });
  
    function renderCategories(categories) {
      categoriesDiv.innerHTML = '';
      categories.forEach((category, index) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.innerHTML = `
          <input type="text" value="${category.name}" data-index="${index}" class="category-name">
          <input type="text" value="${category.sites.join(', ')}" data-index="${index}" class="category-sites">
          <button class="remove-category" data-index="${index}">Remove</button>
        `;
        categoriesDiv.appendChild(categoryDiv);
      });
    }
  
    addCategoryBtn.addEventListener('click', () => {
      const categories = getCategories();
      categories.push({ name: 'New Category', sites: [] });
      renderCategories(categories);
    });
  
    categoriesDiv.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-category')) {
        const index = e.target.dataset.index;
        const categories = getCategories();
        categories.splice(index, 1);
        renderCategories(categories);
      }
    });
  
    saveBtn.addEventListener('click', () => {
      const dailyLimit = parseInt(dailyLimitInput.value);
      const categories = getCategories();
      const retentionPeriod = parseInt(retentionPeriodInput.value);
  
      chrome.storage.sync.set({
        dailyLimit: dailyLimit,
        categories: categories,
        retentionPeriod: retentionPeriod
      }, () => {
        statusDiv.textContent = 'Options saved.';
        statusDiv.className = 'success';
        setTimeout(() => {
          statusDiv.textContent = '';
          statusDiv.className = '';
        }, 3000);
      });
    });
  
    function getCategories() {
      const categories = [];
      document.querySelectorAll('.category-name').forEach((nameInput, index) => {
        const sitesInput = document.querySelector(`.category-sites[data-index="${index}"]`);
        categories.push({
          name: nameInput.value,
          sites: sitesInput.value.split(',').map(site => site.trim())
        });
      });
      return categories;
    }
  });