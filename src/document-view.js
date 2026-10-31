import { escape as e, icon } from './ui.js';

export function liveDocumentPreview(dossier,file,state,can) {
  const field=file.fields.find(item=>item.key===state.evidenceField);
  const sourcePage=state.evidencePage||1;
  const page=file.sourceFileId ? Math.max(1,file.sourcePages.indexOf(sourcePage)+1) : sourcePage;
  const box=field?.source.boundingBox;
  const validBox=Array.isArray(box)&&box.length===4&&box.every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&box[2]>=box[0]&&box[3]>=box[1];
  const preview=state.previewUrl ? state.previewMime==='application/pdf'
    ? `<iframe class="source-pdf" title="Tài liệu gốc" src="${e(state.previewUrl)}#page=${page}"></iframe>`
    : `<div class="source-image"><img src="${e(state.previewUrl)}" alt="Tài liệu gốc"/>${validBox?`<span class="source-bounds" style="left:${box[0]*100}%;top:${box[1]*100}%;width:${(box[2]-box[0])*100}%;height:${(box[3]-box[1])*100}%"></span>`:''}</div>`
    : `<div class="source-placeholder">${icon('shield')}<p>${can('dossier:image_view')?'Mở tài liệu để đối chiếu nguồn. Lượt xem được ghi nhật ký.':'Tài khoản chưa được cấp quyền xem ảnh gốc.'}</p></div>`;
  return `<section class="document-preview"><div class="preview-toolbar"><span data-user-content>${icon('file')} ${e(file.name)}</span><span class="page-indicator">Trang ${sourcePage}</span></div>${preview}
    ${field?`<div class="source-evidence" tabindex="-1" data-source-field="${e(field.key)}"><strong>${e(field.label)}</strong><p>${e(field.source.excerpt||field.value)}</p><small>Trang ${sourcePage}</small></div>`:''}
    <div class="preview-source">${icon('link')} ${file.sourceFileId?'Tệp dẫn xuất · nguồn trang '+e(file.sourcePages.join(', ')):'Tệp gốc · lưu liên kết nguồn'}${can('dossier:image_view')?`<button class="text-link" data-action="view-original">${state.previewUrl?'Tải lại bản gốc':'Xem bản gốc'}</button>`:''}</div></section>`;
}
