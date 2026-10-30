// Google Apps Script for the order channel, shown in CMS → Online Store → Publikimi (copy button) and kept in
// docs/order-channel.gs. The shop POSTs every order, message and booking to it; the CMS reads them back with the key.
export const CHANNEL_SCRIPT = `// ITCOM — kanali i porosive (Google Apps Script, falas).
// Dyqani dërgon këtu çdo porosi, mesazh dhe termin; skripti i ruan në fletën "Dyqani", ju njofton me email
// dhe ia kthen CMS-it kur shtypni "Merr porositë".
//
// Instalimi (5 minuta):
// 1. Krijoni një Google Sheet → Extensions → Apps Script, fshini kodin dhe ngjitni këtë skedar.
// 2. Ndryshoni KEY më poshtë (një fjalë e gjatë sekrete) dhe, nëse doni njoftim, NOTIFY me email-in tuaj.
// 3. Deploy → New deployment → Web app: Execute as "Me", Who has access "Anyone" → Deploy → lejoni qasjen.
// 4. Kopjoni URL-në e Web app (…/exec) te CMS → Online Store → Publikimi → Kanali i porosive, shkruani KEY-n
//    në fushën "Çelësi" dhe shtypni "Publiko" që dyqani ta marrë adresën.

const KEY = 'NDRYSHOJENI-KETE-FJALE-SEKRETE';
const NOTIFY = ''; // p.sh. 'shitja@itcom-ks.com' — bosh = pa email

function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}');
  if (['order', 'inquiry', 'booking'].indexOf(body.kind) < 0) return out({ error: 'kind' });
  const rec = body.record || {};
  const id = rec.id || (rec.booking && rec.booking.id) || '';
  const sheet = book().getSheetByName('Dyqani') || book().insertSheet('Dyqani');
  if (sheet.getLastRow() === 0) sheet.appendRow(['Koha', 'Lloji', 'ID', 'Përmbledhja', 'Të dhënat (JSON)']);
  const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
  if (id && ids.indexOf(id) >= 0) return out({ ok: true, duplicate: true });
  sheet.appendRow([new Date(), body.kind, id, summary(body.kind, rec), JSON.stringify(rec)]);
  if (NOTIFY) MailApp.sendEmail(NOTIFY, subject(body.kind, rec), summary(body.kind, rec) + '\\n\\nHapni CMS-in → Publikimi → Merr porositë.');
  return out({ ok: true });
}

function doGet(e) {
  if (!KEY || e.parameter.key !== KEY) return out({ error: 'key' });
  const sheet = book().getSheetByName('Dyqani');
  if (!sheet || sheet.getLastRow() < 2) return out({ records: [] });
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getValues();
  return out({ records: rows.filter(function (r) { return r[1] && r[4]; }).map(function (r) { return { kind: r[1], record: JSON.parse(r[4]) }; }) });
}

function book() { return SpreadsheetApp.getActiveSpreadsheet(); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function subject(kind, r) {
  if (kind === 'order') return 'ITCOM: porosi e re ' + r.number + ' — ' + r.total + ' €';
  if (kind === 'booking') return 'ITCOM: kërkesë për termin — ' + r.booking.customerName;
  return 'ITCOM: mesazh i ri nga ' + r.name;
}
function summary(kind, r) {
  if (kind === 'order') {
    const c = r.customer || {};
    return [r.number, c.firstName + ' ' + c.lastName, c.phone, c.email, c.address + ', ' + c.city,
      (r.items || []).map(function (l) { return l.qty + ' × ' + l.name; }).join('; '), 'Totali ' + r.total + ' €'].join('\\n');
  }
  if (kind === 'booking') {
    const b = r.booking || {};
    return [b.customerName, b.phone, b.email || '', 'Shërbimi: ' + ((r.inquiry || {}).service || b.serviceId), 'Data: ' + b.start, b.note || ''].join('\\n');
  }
  return [r.name, r.phone, r.email || '', r.company || '', r.message].join('\\n');
}
`;
