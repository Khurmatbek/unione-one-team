let draggedCard = null;

document.addEventListener('DOMContentLoaded', () => {
    if (!localStorage.getItem('initialized')) {
        localStorage.clear();
        localStorage.setItem('initialized', 'true');
    }

    loadTasks();

    const addBtn = document.querySelector('.add-btn');
    const input = document.querySelector('.task-input');

    if (addBtn && input) {
        addBtn.addEventListener('click', () => {
            const text = input.value.trim();
            if (!text) return;
            
            const colorSelectElement = document.querySelector('.color-select');
            const cardColor = colorSelectElement ? colorSelectElement.value : 'card-red';
            
            const dateInput = document.querySelector('.date-input');
            const dateValue = dateInput ? dateInput.value : '';

            const todoContainer = document.querySelector('.column[data-column="todo"] .card-list');
            
            if (todoContainer) {
                const card = createCardElement(text, false, cardColor, dateValue);
                todoContainer.appendChild(card);
                saveTasksToLocalStorage();
                updateBoardCounts();
                input.value = '';
                if (dateInput) dateInput.value = '';
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                addBtn.click();
            }
        });
    }

    setupDragAndDrop();
});

function createCardElement(text, isAccomplished, colorClass = 'card-red', date = '') {
    const card = document.createElement('div');
    card.className = `card ${colorClass}`;
    
    if (isAccomplished) {
        card.classList.add('accomplished-card');
    }
    card.draggable = true;

    card.innerHTML = `
        <div class="card-text">${text}</div>
        <div class="card-date" style="font-size: 11px; color: #64748b; margin-top: 6px;">
            📅 ${date ? date : 'No date'}
        </div>
    `;

    card.addEventListener('dragstart', () => {
        draggedCard = card;
        setTimeout(() => card.classList.add('dragging'), 0);
    });

    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedCard = null;
        saveTasksToLocalStorage();
        updateBoardCounts();
    });

    return card;
}

function setupDragAndDrop() {
    const containers = document.querySelectorAll('.card-list');

    containers.forEach(container => {
        container.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = getDragAfterElement(container, e.clientY);
            const draggingCard = document.querySelector('.dragging');
            
            if (draggingCard) {
                if (afterElement == null) {
                    container.appendChild(draggingCard);
                } else {
                    container.insertBefore(draggingCard, afterElement);
                }
            }
        });

        container.addEventListener('drop', e => {
            e.preventDefault();
            if (!draggedCard) return;

            const column = container.closest('.column');
            if (column) {
                const columnId = column.dataset.column;
                
                if (columnId === 'trash') {
                    draggedCard.remove();
                    let currentDeleted = parseInt(localStorage.getItem('deletedCount') || '0', 10);
                    currentDeleted++;
                    localStorage.setItem('deletedCount', currentDeleted);
                } else if (columnId === 'accomplished') {
                    draggedCard.classList.add('accomplished-card');
                    container.appendChild(draggedCard);
                } else {
                    draggedCard.classList.remove('accomplished-card');
                    container.appendChild(draggedCard);
                }
            }
            saveTasksToLocalStorage();
            updateBoardCounts();
            draggedCard = null;
        });
    });

    const trashColumn = document.querySelector('.column[data-column="trash"]');
    if (trashColumn) {
        trashColumn.addEventListener('dragover', e => e.preventDefault());
        trashColumn.addEventListener('drop', e => {
            e.preventDefault();
            if (draggedCard) {
                draggedCard.remove();
                let currentDeleted = parseInt(localStorage.getItem('deletedCount') || '0', 10);
                currentDeleted++;
                localStorage.setItem('deletedCount', currentDeleted);
                draggedCard = null;
                saveTasksToLocalStorage();
                updateBoardCounts();
            }
        });
    }
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function saveTasksToLocalStorage() {
    ['todo', 'important', 'accomplished'].forEach(columnId => {
        const container = document.querySelector(`.column[data-column="${columnId}"] .card-list`);
        if (container) {
            const cards = [...container.querySelectorAll('.card')];
            const data = cards.map(card => {
                const textEl = card.querySelector('.card-text');
                const dateEl = card.querySelector('.card-date');
                return {
                    text: textEl ? textEl.textContent.trim() : card.textContent.trim(),
                    isAccomplished: card.classList.contains('accomplished-card'),
                    colorClass: [...card.classList].find(cls => cls.startsWith('card-') && cls !== 'card' && cls !== 'accomplished-card') || 'card-red',
                    date: dateEl ? dateEl.textContent.replace('📅', '').trim() : ''
                };
            });
            localStorage.setItem(columnId, JSON.stringify(data));
        }
    });
}

function loadTasks() {
    ['todo', 'important', 'accomplished'].forEach(columnId => {
        const container = document.querySelector(`.column[data-column="${columnId}"] .card-list`);
        if (container) {
            const savedData = localStorage.getItem(columnId);
            if (savedData !== null) {
                container.querySelectorAll('.card').forEach(c => c.remove());
                const tasks = JSON.parse(savedData) || [];
                tasks.forEach(item => {
                    const text = typeof item === 'object' ? item.text : item;
                    const isAcc = typeof item === 'object' ? item.isAccomplished : (columnId === 'accomplished');
                    const cardColor = (typeof item === 'object' && item.colorClass) ? item.colorClass : 'card-red';
                    const date = (typeof item === 'object' && item.date) ? item.date : '';
                    
                    const card = createCardElement(text, isAcc, cardColor, date);
                    container.appendChild(card);
                });
            }
        }
    });
    updateBoardCounts();
}

function updateBoardCounts() {
    const columns = document.querySelectorAll('.column');
    
    columns.forEach(column => {
        const columnId = column.dataset.column;
        if (columnId && columnId !== 'trash') {
            const count = column.querySelectorAll('.card').length;
            const countBadge = column.querySelector('.task-count');
            if (countBadge) {
                countBadge.textContent = count;
            }
        }
    });

    const todoCount = document.querySelectorAll('.column[data-column="todo"] .card').length;
    const importantCount = document.querySelectorAll('.column[data-column="important"] .card').length;
    const accCount = document.querySelectorAll('.column[data-column="accomplished"] .card').length;
    
    const total = todoCount + importantCount + accCount;
    const percent = total > 0 ? Math.round((accCount / total) * 100) : 0;

    const completesText = document.querySelector('.completes-text');
    const progressBarFill = document.querySelector('.progress-bar-fill');

    if (completesText) {
        completesText.textContent = `${accCount} of ${total} tasks accomplished (${percent}%)`;
    }
    
    if (progressBarFill) {
        progressBarFill.style.width = `${percent}%`;
    }

    const trashText = document.querySelector('.trash-text'); 
    if (trashText) {
        const savedDeleted = localStorage.getItem('deletedCount') || '0';
        trashText.textContent = `Deleted: ${savedDeleted}`;
    }
}

