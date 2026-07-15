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

function formatMoney(amount, devise) {
  return `${Number(amount).toLocaleString('fr-FR')} ${devise || 'FCFA'}`;
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
    if (logoData) {
      try {
        doc.addImage(logoData, 'PNG', x, y, 22, 22);
        logoWidth = 26;
      } catch {
        // format d'image non supporté par jsPDF (ex: SVG) : on continue sans logo
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

export async function generateA4Document(document, entreprise, kind) {
  const data = buildDocumentData(document, entreprise, kind);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 15;
  const pageWidth = 210;

  let y = await drawLetterhead(doc, entreprise, margin, margin);
  y += 10;

  doc.setFont(undefined, 'bold');
  doc.setFontSize(16);
  doc.text(data.label, margin, y);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(`N° ${data.numero}`, pageWidth - margin, margin + 5, { align: 'right' });
  doc.text(`Date : ${data.date}`, pageWidth - margin, margin + 10, { align: 'right' });
  y += 8;

  if (data.partnerName) {
    doc.setFont(undefined, 'bold');
    doc.text(`${data.partnerLabel} :`, margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(data.partnerName, margin + 22, y);
    y += 8;
  }

  const hasRemise = data.lignes.some((l) => l.remise !== null);
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
    styles: { fontSize: 9 },
    headStyles: { fillColor: [5, 150, 105] },
  });

  y = doc.lastAutoTable.finalY + 10;

  const rows = [
    ['Sous-total', formatMoney(data.sousTotal, data.devise)],
    ['TVA', formatMoney(data.totalTva, data.devise)],
    ['Total TTC', formatMoney(data.totalTtc, data.devise)],
  ];
  if (data.showPayment) {
    rows.push(['Payé', formatMoney(data.montantPaye, data.devise)]);
    rows.push(['Reste à payer', formatMoney(data.totalTtc - data.montantPaye, data.devise)]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: pageWidth - margin - 70 },
    tableWidth: 70,
    body: rows,
    styles: { fontSize: 9 },
    theme: 'plain',
  });

  y = doc.lastAutoTable.finalY + 10;

  await drawQrCode(
    doc,
    `${entreprise.nom} | ${data.numero} | ${formatMoney(data.totalTtc, data.devise)} | ${data.date}`,
    margin,
    y,
    24,
  );

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
