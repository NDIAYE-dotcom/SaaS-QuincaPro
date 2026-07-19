import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

async function loadImageAsDataUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function detectImageFormat(dataUrl) {
  const match = /^data:image\/(\w+);/i.exec(dataUrl || '');
  const type = match?.[1]?.toUpperCase();
  if (type === 'JPG' || type === 'JPEG') return 'JPEG';
  if (type === 'PNG' || type === 'WEBP' || type === 'BMP') return type;
  return null;
}

function formatMoney(amount, devise) {
  const value = Number(amount) || 0;
  const fixed = Math.abs(value).toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  // Espace normal (U+0020) au lieu du séparateur de toLocaleString('fr-FR') : les polices
  // standards de jsPDF (WinAnsiEncoding) n'ont pas le glyphe de l'espace fine insécable (U+202F)
  // utilisé par certains moteurs JS et l'affichent comme un caractère invalide ("/").
  const withSeparators = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const decimalDisplay = decPart === '00' ? '' : `,${decPart}`;
  return `${value < 0 ? '-' : ''}${withSeparators}${decimalDisplay} ${devise || 'FCFA'}`;
}

const VENTE_LABELS = {
  devis: 'DEVIS',
  facture: 'FACTURE',
  annulee: 'FACTURE ANNULÉE',
};

const ACHAT_LABELS = {
  commande: 'BON DE COMMANDE',
  recu: 'FACTURE FOURNISSEUR',
  annule: 'ACHAT ANNULÉ',
};

function buildDocumentData(document, entreprise, kind) {
  const isVente = kind === 'vente';
  const partner = isVente ? document.client : document.fournisseur;

  let label;
  if (isVente) {
    label = VENTE_LABELS[document.statut] || 'DOCUMENT';
    if (document.statut === 'facture' && document.type_facture === 'hors_taxe') {
      label = 'FACTURE HORS TAXE';
    }
  } else {
    label = ACHAT_LABELS[document.statut] || 'DOCUMENT';
  }

  return {
    label,
    partnerLabel: isVente ? 'Client' : 'Fournisseur',
    partnerName: partner?.nom || (isVente ? 'Client comptoir' : ''),
    numero: document.numero,
    date: new Date(document.created_at).toLocaleDateString('fr-FR'),
    lignes: document.lignes.map((l) => ({
      nom: l.produit?.nom || '',
      unite: l.produit?.unite || '',
      quantite: l.quantite,
      prixUnitaire: l.prix_unitaire,
      remise: l.remise_pourcentage ?? null,
      tva: l.taux_tva,
      total: l.total_ligne,
    })),
    sousTotal: document.sous_total,
    totalTva: document.total_tva,
    totalTtc: document.total_ttc,
    montantPaye: document.montant_paye,
    showPayment: (isVente && document.statut === 'facture') || (!isVente && document.statut === 'recu'),
    devise: entreprise.devise || 'FCFA',
  };
}

async function drawLetterhead(doc, entreprise, x, y) {
  let logoWidth = 0;
  if (entreprise.logo_url) {
    const logoData = await loadImageAsDataUrl(entreprise.logo_url);
    const format = detectImageFormat(logoData);
    if (logoData && format) {
      try {
        doc.addImage(logoData, format, x, y, 22, 22);
        logoWidth = 26;
      } catch {
        // image corrompue ou illisible par jsPDF : on continue sans logo
      }
    }
  }

  const textX = x + logoWidth;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(13);
  doc.text(entreprise.nom || '', textX, y + 5);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(8.5);

  let infoY = y + 10;
  [
    entreprise.adresse,
    entreprise.telephone && `Tél : ${entreprise.telephone}`,
    entreprise.email,
    entreprise.ninea && `NINEA : ${entreprise.ninea}`,
    entreprise.rccm && `RCCM : ${entreprise.rccm}`,
  ]
    .filter(Boolean)
    .forEach((line) => {
      doc.text(line, textX, infoY);
      infoY += 4;
    });

  return Math.max(infoY, y + 24);
}

async function drawQrCode(doc, text, x, y, size) {
  try {
    const qrData = await QRCode.toDataURL(text, { margin: 0 });
    doc.addImage(qrData, 'PNG', x, y, size, size);
  } catch {
    // la génération du QR code n'est pas bloquante pour le document
  }
}

// Boîte "Cachet & signature" en bas à droite : affiche le cachet/la signature
// de l'entreprise si configurés dans Paramètres, sinon reste vide pour un
// tampon/paraphe manuel après impression.
async function drawStampBox(doc, entreprise, rightEdge, y) {
  const width = 55;
  const height = 28;
  const x = rightEdge - width;

  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('CACHET & SIGNATURE', x, y - 2);
  doc.setTextColor(0, 0, 0);

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, 'S');

  if (entreprise.cachet_url) {
    const cachetData = await loadImageAsDataUrl(entreprise.cachet_url);
    const format = detectImageFormat(cachetData);
    if (format) {
      try {
        const size = 22;
        doc.addImage(cachetData, format, x + width - size - 3, y + (height - size) / 2, size, size);
      } catch {
        // image illisible par jsPDF : on continue sans cachet
      }
    }
  }

  if (entreprise.signature_url) {
    const signatureData = await loadImageAsDataUrl(entreprise.signature_url);
    const format = detectImageFormat(signatureData);
    if (format) {
      try {
        const sigWidth = 28;
        const sigHeight = 14;
        doc.addImage(signatureData, format, x + 3, y + height - sigHeight - 3, sigWidth, sigHeight);
      } catch {
        // image illisible par jsPDF : on continue sans signature
      }
    }
  }
}

const BRAND = [47, 155, 179];
const TEXT_MUTED = [110, 110, 110];
const BG_LIGHT = [240, 246, 248];
const ACCENT_DANGER = [195, 60, 45];
const ACCENT_SUCCESS = [40, 140, 85];

export async function generateA4Document(document, entreprise, kind) {
  const data = buildDocumentData(document, entreprise, kind);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;

  const headerBottom = await drawLetterhead(doc, entreprise, margin, margin);

  const badgeWidth = 55;
  const badgeX = pageWidth - margin - badgeWidth;
  doc.setFillColor(...BRAND);
  doc.roundedRect(badgeX, margin - 2, badgeWidth, 10, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text(data.label, badgeX + badgeWidth / 2, margin + 4.8, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(`N° ${data.numero}`, pageWidth - margin, margin + 15, { align: 'right' });
  doc.text(`Date : ${data.date}`, pageWidth - margin, margin + 20, { align: 'right' });

  let y = Math.max(headerBottom, margin + 25) + 6;

  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  if (data.partnerName) {
    const boxHeight = 14;
    doc.setFillColor(...BG_LIGHT);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 1.5, 1.5, 'F');
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_MUTED);
    doc.text(data.partnerLabel.toUpperCase(), margin + 4, y + 5.5);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(data.partnerName, margin + 4, y + 11);
    y += boxHeight + 8;
  }

  const hasRemise = data.lignes.some((l) => l.remise !== null);
  const columnStyles = { 1: { halign: 'center' }, 2: { halign: 'right' } };
  let colIndex = 3;
  if (hasRemise) columnStyles[colIndex++] = { halign: 'right' };
  columnStyles[colIndex++] = { halign: 'right' };
  columnStyles[colIndex] = { halign: 'right', fontStyle: 'bold' };

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Produit', 'Qté', 'Prix unit.', ...(hasRemise ? ['Remise'] : []), 'TVA', 'Total']],
    body: data.lignes.map((l) => [
      l.nom,
      `${l.quantite} ${l.unite}`,
      formatMoney(l.prixUnitaire, data.devise),
      ...(hasRemise ? [`${l.remise}%`] : []),
      `${l.tva}%`,
      formatMoney(l.total, data.devise),
    ]),
    styles: { fontSize: 9, cellPadding: 3, textColor: [40, 40, 40] },
    headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG_LIGHT },
    columnStyles,
  });

  y = doc.lastAutoTable.finalY + 8;

  const totalsWidth = 75;
  const totalsX = pageWidth - margin - totalsWidth;

  autoTable(doc, {
    startY: y,
    margin: { left: totalsX },
    tableWidth: totalsWidth,
    body: [
      ['Sous-total', formatMoney(data.sousTotal, data.devise)],
      ['TVA', formatMoney(data.totalTva, data.devise)],
    ],
    styles: { fontSize: 9.5, cellPadding: 2 },
    columnStyles: { 1: { halign: 'right' } },
    theme: 'plain',
  });

  y = doc.lastAutoTable.finalY + 3;

  doc.setFillColor(...BRAND);
  doc.roundedRect(totalsX, y, totalsWidth, 10, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10.5);
  doc.text('Total TTC', totalsX + 4, y + 6.7);
  doc.text(formatMoney(data.totalTtc, data.devise), totalsX + totalsWidth - 4, y + 6.7, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 14;

  if (data.showPayment) {
    const reste = data.totalTtc - data.montantPaye;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9.5);
    doc.text('Payé', totalsX, y);
    doc.text(formatMoney(data.montantPaye, data.devise), totalsX + totalsWidth, y, { align: 'right' });
    y += 6;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...(reste > 0 ? ACCENT_DANGER : ACCENT_SUCCESS));
    doc.text('Reste à payer', totalsX, y);
    doc.text(formatMoney(reste, data.devise), totalsX + totalsWidth, y, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    y += 8;
  }

  y += 4;
  const qrY = y;
  await drawQrCode(
    doc,
    `${entreprise.nom} | ${data.numero} | ${formatMoney(data.totalTtc, data.devise)} | ${data.date}`,
    margin,
    qrY,
    22,
  );
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text('Merci de votre confiance.', margin + 27, qrY + 12);
  doc.setTextColor(0, 0, 0);

  await drawStampBox(doc, entreprise, pageWidth - margin, qrY);

  const footerY = 282;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(entreprise.nom || '', margin, footerY + 4);
  doc.text(data.numero, pageWidth - margin, footerY + 4, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  doc.save(`${data.numero}.pdf`);
}

export async function generateThermalDocument(document, entreprise, kind, widthMm = 80) {
  const data = buildDocumentData(document, entreprise, kind);
  const isNarrow = widthMm <= 58;
  const margin = isNarrow ? 3 : 4;
  const estimatedHeight = 65 + data.lignes.length * 9 + (data.showPayment ? 16 : 0);

  const doc = new jsPDF({ unit: 'mm', format: [widthMm, estimatedHeight] });
  const pageWidth = widthMm;
  const center = pageWidth / 2;
  let y = margin + 4;

  doc.setFont(undefined, 'bold');
  doc.setFontSize(isNarrow ? 9 : 10.5);
  doc.text(entreprise.nom || '', center, y, { align: 'center' });
  y += 4.5;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(isNarrow ? 6.5 : 7.5);
  [entreprise.adresse, entreprise.telephone].filter(Boolean).forEach((line) => {
    doc.text(line, center, y, { align: 'center' });
    y += 3.5;
  });

  y += 2;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(isNarrow ? 8 : 9.5);
  doc.text(data.label, center, y, { align: 'center' });
  y += 4;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(isNarrow ? 6.5 : 7.5);
  doc.text(`N° ${data.numero}  ·  ${data.date}`, center, y, { align: 'center' });
  y += 4;
  if (data.partnerName) {
    doc.text(data.partnerName, center, y, { align: 'center' });
    y += 4;
  }

  y += 1;
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  doc.setFontSize(isNarrow ? 6.5 : 7.5);
  data.lignes.forEach((l) => {
    doc.text(l.nom, margin, y);
    y += 3.3;
    doc.text(`${l.quantite} x ${formatMoney(l.prixUnitaire, data.devise)}`, margin, y);
    doc.text(formatMoney(l.total, data.devise), pageWidth - margin, y, { align: 'right' });
    y += 4.3;
  });

  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  function row(label, value, bold = false) {
    doc.setFont(undefined, bold ? 'bold' : 'normal');
    doc.text(label, margin, y);
    doc.text(formatMoney(value, data.devise), pageWidth - margin, y, { align: 'right' });
    doc.setFont(undefined, 'normal');
    y += 4;
  }

  row('Sous-total', data.sousTotal);
  row('TVA', data.totalTva);
  row('Total TTC', data.totalTtc, true);
  if (data.showPayment) {
    row('Payé', data.montantPaye);
    row('Reste', data.totalTtc - data.montantPaye, true);
  }

  y += 2;
  doc.setFontSize(isNarrow ? 6 : 7);
  doc.text('Merci de votre confiance', center, y, { align: 'center' });

  doc.save(`${data.numero}.pdf`);
}

export async function generateDocument(document, entreprise, kind, format) {
  if (format === 'thermal80') return generateThermalDocument(document, entreprise, kind, 80);
  if (format === 'thermal58') return generateThermalDocument(document, entreprise, kind, 58);
  return generateA4Document(document, entreprise, kind);
}

export async function generateReportPdf({ title, subtitle, entreprise, columns, rows, filename }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: columns.length > 5 ? 'landscape' : 'portrait' });
  const margin = 15;

  let y = await drawLetterhead(doc, entreprise, margin, margin);
  y += 8;

  doc.setFont(undefined, 'bold');
  doc.setFontSize(15);
  doc.text(title, margin, y);
  y += 6;

  if (subtitle) {
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100);
    doc.text(subtitle, margin, y);
    doc.setTextColor(0);
    y += 6;
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [columns.map((c) => c.label)],
    body: rows.map((row) => columns.map((c) => (c.format ? c.format(row[c.key]) : (row[c.key] ?? '—')))),
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: BRAND },
  });

  doc.save(filename);
}
