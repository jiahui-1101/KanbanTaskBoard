// ============================================================
//  taskmanager.js — Kanban Task Board (vanilla JS, no libs)
// ============================================================

// ────────────────────────────────────────────────────────────
//  1. DATA STORE
//  All tasks live in this array. No localStorage used.
// ────────────────────────────────────────────────────────────
let tasks = [];             // Array of task objects
let nextId = 1;             // Auto-increment ID for each new task
let currentColumn = null;   // Which column the modal was opened from
let editingTaskId  = null;  // null = adding new task, number = editing existing

// ────────────────────────────────────────────────────────────
//  2. DOM REFERENCES
//  Grab all the elements we'll touch repeatedly.
// ────────────────────────────────────────────────────────────
const todoList       = document.getElementById('todo-list');
const inprogressList = document.getElementById('inprogress-list');
const doneList       = document.getElementById('done-list');

const taskCounter    = document.getElementById('task-counter');
const priorityFilter = document.getElementById('priority-filter');

const modalOverlay   = document.getElementById('modal-overlay');
const modalTitle     = document.getElementById('modal-title');
const inputTitle     = document.getElementById('input-title');
const inputDesc      = document.getElementById('input-description');
const inputPriority  = document.getElementById('input-priority');
const inputDueDate   = document.getElementById('input-due-date');
const inputColumn    = document.getElementById('input-column');    // Move To selector
const moveToWrapper  = document.getElementById('move-to-wrapper'); // wrapper div

const btnSave        = document.getElementById('btn-save');
const btnCancel      = document.getElementById('btn-cancel');
const btnClearDone   = document.getElementById('btn-clear-done');

// ────────────────────────────────────────────────────────────
//  3. HELPER — get the <ul> element for a given column id
// ────────────────────────────────────────────────────────────
function getListElement(columnId) {
  if (columnId === 'todo')       return todoList;
  if (columnId === 'inprogress') return inprogressList;
  if (columnId === 'done')       return doneList;
  return null;
}

// ────────────────────────────────────────────────────────────
//  4. TASK COUNTER — updates the badge in the header
// ────────────────────────────────────────────────────────────
function updateCounter() {
  const total = tasks.length;
  taskCounter.textContent = total === 1 ? '1 task' : total + ' tasks';
}

// ────────────────────────────────────────────────────────────
//  5. createTaskCard(taskObj)
//  Builds and returns a <li> card using only DOM API methods.
//  ⚠️  No innerHTML / innerText / template literals for building elements.
// ────────────────────────────────────────────────────────────
function createTaskCard(taskObj) {
  // --- <li> wrapper ---
  const li = document.createElement('li');
  li.setAttribute('data-id', taskObj.id);
  li.setAttribute('data-priority', taskObj.priority);
  li.classList.add('task-card');

  // --- Title <span> (double-click triggers inline edit) ---
  const titleSpan = document.createElement('span');
  titleSpan.classList.add('task-title');
  titleSpan.textContent = taskObj.title;
  titleSpan.setAttribute('title', 'Double-click to edit title');
  titleSpan.addEventListener('dblclick', function () {
    startInlineEdit(titleSpan, taskObj.id);
  });

  // --- Description <p> ---
  const descP = document.createElement('p');
  descP.classList.add('task-desc');
  descP.textContent = taskObj.description || '';

  // --- Due date <span> ---
  const dueSpan = document.createElement('span');
  dueSpan.classList.add('task-due');
  dueSpan.textContent = taskObj.dueDate ? '📅 ' + taskObj.dueDate : '';

  // --- Footer row: badge + buttons ---
  const footer = document.createElement('div');
  footer.classList.add('task-footer');

  // Priority badge
  const badge = document.createElement('span');
  badge.classList.add('priority-badge', taskObj.priority);
  badge.textContent = taskObj.priority;

  // Button container
  const actions = document.createElement('div');
  actions.classList.add('card-actions');

  // Edit button — uses data-action & data-id for event delegation
  const editBtn = document.createElement('button');
  editBtn.classList.add('btn-edit');
  editBtn.textContent = 'Edit';
  editBtn.setAttribute('data-action', 'edit');
  editBtn.setAttribute('data-id', taskObj.id);

  // Delete button — same pattern
  const deleteBtn = document.createElement('button');
  deleteBtn.classList.add('btn-delete');
  deleteBtn.textContent = 'Delete';
  deleteBtn.setAttribute('data-action', 'delete');
  deleteBtn.setAttribute('data-id', taskObj.id);

  // Assemble actions → footer
  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  footer.appendChild(badge);
  footer.appendChild(actions);

  // Assemble full card
  li.appendChild(titleSpan);
  li.appendChild(descP);
  li.appendChild(dueSpan);
  li.appendChild(footer);

  return li;
}

// ────────────────────────────────────────────────────────────
//  6. addTask(columnId, taskObj)
//  Saves the task to the data store and renders it in the DOM.
// ────────────────────────────────────────────────────────────
function addTask(columnId, taskObj) {
  // Save to data array
  tasks.push(taskObj);

  // Build the card and insert it into the correct list
  const card = createTaskCard(taskObj);
  const list = getListElement(columnId);
  list.appendChild(card);

  // Keep the counter badge up to date
  updateCounter();

  // Apply the current filter so the new card obeys active filter immediately
  applyFilter(priorityFilter.value);
}

// ────────────────────────────────────────────────────────────
//  7. deleteTask(taskId)
//  Animates the card out, then removes it from DOM and array.
// ────────────────────────────────────────────────────────────
function deleteTask(taskId) {
  const card = document.querySelector('[data-id="' + taskId + '"]');
  if (!card) return;

  // Add CSS class that triggers the fade-out keyframe animation
  card.classList.add('fade-out');

  // Wait for animation to finish (300 ms matches the CSS duration)
  card.addEventListener('animationend', function () {
    card.remove();
    tasks = tasks.filter(function (t) { return t.id !== taskId; });
    updateCounter();
  });
}

// ────────────────────────────────────────────────────────────
//  8. editTask(taskId)
//  Opens the modal pre-filled with that task's existing data.
//  Also shows the "Move To Column" selector.
// ────────────────────────────────────────────────────────────
function editTask(taskId) {
  const task = tasks.find(function (t) { return t.id === taskId; });
  if (!task) return;

  // Remember which task we are editing
  editingTaskId = taskId;
  currentColumn = task.columnId;

  // Pre-fill the modal fields
  modalTitle.textContent = 'Edit Task';
  inputTitle.value       = task.title;
  inputDesc.value        = task.description;
  inputPriority.value    = task.priority;
  inputDueDate.value     = task.dueDate;

  // Show "Move To" selector and set it to the task's current column
  moveToWrapper.classList.remove('hidden');
  inputColumn.value = task.columnId;

  // Show the modal
  modalOverlay.classList.remove('hidden');
  inputTitle.focus();
}

// ────────────────────────────────────────────────────────────
//  9. moveTask(taskId, newColumnId)
//  Moves a task card from its current column to a new one.
//  Updates both the data array and the DOM.
// ────────────────────────────────────────────────────────────
function moveTask(taskId, newColumnId) {
  const task = tasks.find(function (t) { return t.id === taskId; });
  if (!task) return;
  if (task.columnId === newColumnId) return; // already in that column — no-op

  // Remove the card from the current column in the DOM
  const oldCard = document.querySelector('[data-id="' + taskId + '"]');
  if (oldCard) oldCard.remove();

  // Update the column reference in the data store
  task.columnId = newColumnId;

  // Build a fresh card and append it to the new column
  const newCard = createTaskCard(task);
  const newList = getListElement(newColumnId);
  newList.appendChild(newCard);

  // Re-apply the active filter so the moved card respects it
  applyFilter(priorityFilter.value);
}

// ────────────────────────────────────────────────────────────
//  10. updateTask(taskId, updatedData)
//  Updates the task object in the array and refreshes the card.
//  Calls moveTask() if the user changed the column.
// ────────────────────────────────────────────────────────────
function updateTask(taskId, updatedData) {
  const task = tasks.find(function (t) { return t.id === taskId; });
  if (!task) return;

  // Update all editable fields
  task.title       = updatedData.title;
  task.description = updatedData.description;
  task.priority    = updatedData.priority;
  task.dueDate     = updatedData.dueDate;

  // Handle column change — move first, then rebuild card in new column
  const targetColumnId = updatedData.columnId;
  if (targetColumnId !== task.columnId) {
    // moveTask updates task.columnId and rebuilds the card in the new list
    moveTask(taskId, targetColumnId);
  } else {
    // Same column — just replace the card in place
    const oldCard = document.querySelector('[data-id="' + taskId + '"]');
    if (!oldCard) return;
    const newCard = createTaskCard(task);
    oldCard.replaceWith(newCard);
  }

  // Re-apply the active filter
  applyFilter(priorityFilter.value);
}

// ────────────────────────────────────────────────────────────
//  11. MODAL — open for adding a new task
// ────────────────────────────────────────────────────────────
function openModalForAdd(columnId) {
  editingTaskId = null;    // Not editing — we are adding
  currentColumn = columnId;

  // Reset all fields
  modalTitle.textContent = 'Add Task';
  inputTitle.value       = '';
  inputDesc.value        = '';
  inputPriority.value    = 'low';
  inputDueDate.value     = '';

  // Hide the "Move To" selector — only relevant when editing
  moveToWrapper.classList.add('hidden');

  modalOverlay.classList.remove('hidden');
  inputTitle.focus();
}

// ────────────────────────────────────────────────────────────
//  12. MODAL — close / cancel
// ────────────────────────────────────────────────────────────
function closeModal() {
  modalOverlay.classList.add('hidden');
  editingTaskId = null;
  currentColumn = null;
}

// ────────────────────────────────────────────────────────────
//  13. MODAL — Save button handler
// ────────────────────────────────────────────────────────────
btnSave.addEventListener('click', function () {
  const title = inputTitle.value.trim();

  // Basic validation — title must not be empty
  if (!title) {
    inputTitle.style.borderColor = '#e74c3c';
    inputTitle.focus();
    return;
  }
  inputTitle.style.borderColor = '';

  if (editingTaskId !== null) {
    // ── EDIT MODE: update (and possibly move) existing task ──
    updateTask(editingTaskId, {
      title:       title,
      description: inputDesc.value.trim(),
      priority:    inputPriority.value,
      dueDate:     inputDueDate.value,
      columnId:    inputColumn.value,   // may differ from task.columnId
    });
  } else {
    // ── ADD MODE: create and insert a new task ──
    const newTask = {
      id:          nextId++,
      columnId:    currentColumn,
      title:       title,
      description: inputDesc.value.trim(),
      priority:    inputPriority.value,
      dueDate:     inputDueDate.value,
    };
    addTask(currentColumn, newTask);
  }

  closeModal();
});

// ────────────────────────────────────────────────────────────
//  14. MODAL — Cancel button & overlay-click to dismiss
// ────────────────────────────────────────────────────────────
btnCancel.addEventListener('click', closeModal);

// Click the dark overlay (not the white modal box) to close
modalOverlay.addEventListener('click', function (e) {
  if (e.target === modalOverlay) closeModal();
});

// ────────────────────────────────────────────────────────────
//  15. ADD TASK BUTTONS — delegated to the board container
//  One listener catches all three "+ Add Task" button clicks.
// ────────────────────────────────────────────────────────────
document.querySelector('.board').addEventListener('click', function (e) {
  if (e.target.classList.contains('btn-add')) {
    const columnId = e.target.getAttribute('data-column');
    openModalForAdd(columnId);
  }
});

// ────────────────────────────────────────────────────────────
//  16. EVENT DELEGATION — Edit & Delete for each column's <ul>
//  ONE listener per <ul> handles ALL button clicks inside it.
//  Rubric requirement: single listener per column.
// ────────────────────────────────────────────────────────────
function attachColumnListener(listElement) {
  listElement.addEventListener('click', function (event) {
    const action = event.target.getAttribute('data-action'); // 'edit' or 'delete'
    const idStr  = event.target.getAttribute('data-id');
    if (!action || !idStr) return; // Click was on something else — ignore

    const taskId = parseInt(idStr, 10);

    if (action === 'delete') { deleteTask(taskId); }
    if (action === 'edit')   { editTask(taskId);   }
  });
}

// Attach one listener to each column list
attachColumnListener(todoList);
attachColumnListener(inprogressList);
attachColumnListener(doneList);

// ────────────────────────────────────────────────────────────
//  17. INLINE EDITING — double-click a title to rename it
//  Replaces the <span> with an <input>; Enter or blur commits.
// ────────────────────────────────────────────────────────────
function startInlineEdit(titleSpan, taskId) {
  // Create an <input> pre-filled with the current title
  const input = document.createElement('input');
  input.type  = 'text';
  input.value = titleSpan.textContent;
  input.classList.add('inline-edit-input');

  // Swap <span> → <input>
  titleSpan.replaceWith(input);
  input.focus();
  input.select(); // highlight all text for convenience

  let committed = false; // guard against double-commit (Enter then blur)

  // Commit the change: update data store and restore <span>
  function commitEdit() {
    if (committed) return; // prevent double-fire
    committed = true;

    const newTitle = input.value.trim();

    // Update data store
    const task = tasks.find(function (t) { return t.id === taskId; });
    if (task) {
      task.title = newTitle || task.title; // keep old title if input is empty
    }

    // Create a fresh <span> with the updated title
    const newSpan = document.createElement('span');
    newSpan.classList.add('task-title');
    newSpan.textContent = task ? task.title : newTitle;
    newSpan.setAttribute('title', 'Double-click to edit title');
    newSpan.addEventListener('dblclick', function () {
      startInlineEdit(newSpan, taskId);
    });

    // Swap <input> back to <span>
    input.replaceWith(newSpan);
  }

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      commitEdit();
    }
    if (e.key === 'Escape') {
      // Cancel — restore original text without saving
      committed = true; // prevent blur from committing after Escape
      const cancelSpan = document.createElement('span');
      cancelSpan.classList.add('task-title');
      cancelSpan.textContent = titleSpan.textContent; // original text
      cancelSpan.setAttribute('title', 'Double-click to edit title');
      cancelSpan.addEventListener('dblclick', function () {
        startInlineEdit(cancelSpan, taskId);
      });
      input.replaceWith(cancelSpan);
    }
  });

  input.addEventListener('blur', commitEdit);
}

// ────────────────────────────────────────────────────────────
//  18. PRIORITY FILTER
//  Shows/hides cards using classList.toggle('is-hidden', condition).
//  No style.display is used — per rubric requirement.
// ────────────────────────────────────────────────────────────
function applyFilter(selectedPriority) {
  const allCards = document.querySelectorAll('.task-card');

  allCards.forEach(function (card) {
    const cardPriority = card.getAttribute('data-priority');
    // Hide card if a filter is active AND card priority doesn't match
    const shouldHide = selectedPriority !== 'all' && cardPriority !== selectedPriority;
    card.classList.toggle('is-hidden', shouldHide);
  });
}

priorityFilter.addEventListener('change', function () {
  applyFilter(this.value);
});

// ────────────────────────────────────────────────────────────
//  19. CLEAR DONE — staggered fade-out (100 ms between each card)
// ────────────────────────────────────────────────────────────
btnClearDone.addEventListener('click', function () {
  // Snapshot the list first — querySelectorAll is live so grab it once
  const doneCards = Array.from(doneList.querySelectorAll('.task-card'));

  doneCards.forEach(function (card, index) {
    // Each card starts fading 100 ms after the previous one
    setTimeout(function () {
      card.classList.add('fade-out');

      card.addEventListener('animationend', function () {
        const taskId = parseInt(card.getAttribute('data-id'), 10);
        card.remove();
        tasks = tasks.filter(function (t) { return t.id !== taskId; });
        updateCounter();
      });
    }, index * 100);
  });
});

// ────────────────────────────────────────────────────────────
//  20. KEYBOARD SHORTCUT — Escape closes the modal
// ────────────────────────────────────────────────────────────
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});
