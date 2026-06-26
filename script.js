const navButtons = document.querySelectorAll('.nav-button');
const screens = document.querySelectorAll('.screen');
const recordForm = document.getElementById('record-form');
const recordList = document.getElementById('record-list');
const mergedSummary = document.getElementById('merged-summary');
const mergeButton = document.getElementById('merge-records');
const downloadButton = document.getElementById('download-summary');
const clearRecordsButton = document.getElementById('clear-records');
const pdfFileInput = document.getElementById('record-file');
const biographyInput = document.getElementById('biography');
const bioForm = document.getElementById('bio-form');
const bioPreview = document.getElementById('bio-preview-content');
const clearBioButton = document.getElementById('clear-bio');

let records = JSON.parse(localStorage.getItem('patientRecords') || '[]');
let biographyText = localStorage.getItem('patientBiography') || '';

function switchScreen(event) {
  const screenId = event.target.dataset.screen;
  if (!screenId) return;

  navButtons.forEach((button) => button.classList.toggle('active', button.dataset.screen === screenId));
  screens.forEach((screen) => screen.classList.toggle('active', screen.id === screenId));
}

function saveRecords() {
  localStorage.setItem('patientRecords', JSON.stringify(records));
}

function renderRecords() {
  if (!records.length) {
    recordList.innerHTML = '<p class="empty-state">No records added yet. Use the form above to add specialist records.</p>';
    return;
  }

  recordList.innerHTML = records
    .map((record, index) => {
      return `
        <article class="record-card">
          <div class="record-meta">
            <span><strong>Provider:</strong> ${escapeHtml(record.specialist)}</span>
            <span><strong>Date:</strong> ${escapeHtml(record.date)}</span>
          </div>
          <h3>${escapeHtml(record.title)}</h3>
          <p>${escapeHtml(record.details)}</p>
          ${record.attachmentName ? `<div class="record-attachment"><strong>Attachment:</strong> <a href="${record.attachmentData}" download="${escapeHtml(record.attachmentName)}">${escapeHtml(record.attachmentName)}</a></div>` : ''}
          <button type="button" class="secondary-button remove-record" data-index="${index}">Remove</button>
        </article>
      `;
    })
    .join('');
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function readPdfAttachment(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function addRecord(event) {
  event.preventDefault();

  const specialist = event.target.specialist.value.trim();
  const title = event.target.recordTitle.value.trim();
  const date = event.target.recordDate.value;
  const details = event.target.recordDetails.value.trim();
  const file = pdfFileInput.files[0];

  if (!specialist || !title || !date || !details) {
    return;
  }

  let attachmentName = '';
  let attachmentData = '';

  if (file) {
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are supported for import.');
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      alert('Please choose a PDF smaller than 1.5 MB so it can be saved in your browser.');
      return;
    }
    try {
      attachmentData = await readPdfAttachment(file);
      attachmentName = file.name;
    } catch (err) {
      alert('Unable to read the selected PDF file.');
      return;
    }
  }

  records.push({ specialist, title, date, details, attachmentName, attachmentData });
  saveRecords();
  renderRecords();
  mergedSummary.textContent = '';
  recordForm.reset();
  pdfFileInput.value = '';
}

function removeRecord(event) {
  if (!event.target.classList.contains('remove-record')) return;

  const index = Number(event.target.dataset.index);
  records.splice(index, 1);
  saveRecords();
  renderRecords();
}

function clearRecords() {
  if (!window.confirm('Clear all medical records? This cannot be undone.')) return;
  records = [];
  saveRecords();
  renderRecords();
  mergedSummary.textContent = '';
}

function generateMergedSummary() {
  if (!records.length) {
    mergedSummary.textContent = 'Add specialist records to create a combined summary.';
    return;
  }

  const grouped = records.reduce((acc, record) => {
    const provider = record.specialist || 'Unknown provider';
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(record);
    return acc;
  }, {});

  const summaryLines = ['Combined Medical Record Summary', ''];

  for (const [provider, items] of Object.entries(grouped)) {
    summaryLines.push(`Provider: ${provider}`);
    items.forEach((item, index) => {
      summaryLines.push(`  ${index + 1}. ${item.title} (${item.date})`);
      summaryLines.push(`     ${item.details}`);
      if (item.attachmentName) {
        summaryLines.push(`     Attachment: ${item.attachmentName}`);
      }
    });
    summaryLines.push('');
  }

  const fullText = summaryLines.join('\n');
  mergedSummary.textContent = fullText;
  downloadButton.disabled = false;
}

function downloadSummary() {
  const text = mergedSummary.textContent.trim();
  if (!text) return;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'patient-record-summary.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function renderBiography() {
  biographyInput.value = biographyText;
  bioPreview.textContent = biographyText || 'Your biography will appear here after saving.';
}

function saveBiography(event) {
  event.preventDefault();
  biographyText = biographyInput.value.trim();
  localStorage.setItem('patientBiography', biographyText);
  renderBiography();
}

function clearBiography() {
  if (!window.confirm('Reset your biography?')) return;
  biographyText = '';
  localStorage.removeItem('patientBiography');
  renderBiography();
}

navButtons.forEach((button) => button.addEventListener('click', switchScreen));
recordForm.addEventListener('submit', addRecord);
recordList.addEventListener('click', removeRecord);
mergeButton.addEventListener('click', generateMergedSummary);
downloadButton.addEventListener('click', downloadSummary);
clearRecordsButton.addEventListener('click', clearRecords);
bioForm.addEventListener('submit', saveBiography);
clearBioButton.addEventListener('click', clearBiography);

downloadButton.disabled = true;
renderRecords();
renderBiography();
