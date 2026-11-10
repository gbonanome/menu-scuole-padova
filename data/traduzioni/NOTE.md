# Traduzioni dei piatti: dubbi da far rivedere

Le traduzioni in `piatti-<lingua>.json` non sono state riviste da madrelingua. Qui sotto le scelte incerte, da controllare.

## Tutte le lingue

- **Noccioline** (es. "Noccioline al ragù di manzo"): è un formato di pasta, non arachidi né nocciole. Reso come "noccioline (pasta piccola)". Se fossero gnocchetti di patate, va corretto.
- **Ragù di carni bianche**: reso come "ragù di carne bianca" senza dire quale. Chi non mangia maiale vorrebbe saperlo: da chiedere a Dussmann prima di precisarlo.
- **Polpette** e **Polpettone** senza altro: resi come "polpette di carne" / "polpettone", senza indicare la carne.
- **Alla pizzaiola**: reso come "alla pizzaiola (salsa di pomodoro)". Potrebbe contenere origano o formaggio.
- **Alla mugnaia**: reso come "meunière"; non sappiamo se ci sono burro o farina, quindi non è scritto.
- **Frullato** da solo: reso come "smoothie"; potrebbe contenere latte.
- **Torta di riso**: resa come dolce (torta di riso dolce), perché compare tra merende e dessert.
- **Riso morbido alle erbette**: "erbette" reso come "verdure a foglia" (in Veneto sono le foglie di bieta).
- **Farro**: reso come "farro (spelta)"; in senso stretto è il farro dicocco.
- **Sformato** e **tortino**: resi come "pasticcio/sformato al forno".
- **Verdura cotta e cruda oppure per entrambi** (dal PDF del nido integrato): il senso non è chiaro, reso come "verdura cotta e cruda, oppure entrambe".
- **Yogurt da bere in vasetto**: contraddittorio, tradotto alla lettera.
- **Prosciutto cotto/crudo**: in bengalese, albanese, arabo e urdu c'è scritto anche "carne di maiale"; in inglese, rumeno e cinese basta "ham"/"火腿".
- **Trifolate**, **al funghetto**: resi come "saltate"/"in padella", senza aggiungere aglio e prezzemolo.

## Inglese (en)

- Grafia americana: zucchini, eggplant, corn, cookies. "Fette biscottate" → "Rusks".
- "Gratinato" → "au gratin"; "Crema di …" → "Puréed … soup" (per non far pensare alla panna).

## Rumeno (ro)

- "Supă-cremă" per crema e passato: in rumeno è comune, ma potrebbe far pensare alla panna.
- "Fette biscottate" → "Pesmeți"; "puledro" → "mânz (cal)"; "bieta" → "mangold".

## Cinese semplificato (zh)

- Nomi dei formati di pasta lasciati in lettere latine con una breve descrizione (es. "chifferi 弯管面").
- "Pizzaiola" → "披萨师风味"; "ragù di carni bianche" → "白肉酱"; "crema di …" → "…浓汤".
- "Fette biscottate" → "面包干"; "tè deteinato" → "脱因茶".

## Bengalese (bn)

- "Formaggio" → "চিজ" (non "পনির", che fa pensare al paneer).
- Traslitterazione dei formati di pasta da verificare (es. "নোচ্চোলিনে", "স্তোর্তিনি").
- "Uova strapazzate" → "ঝুরি ডিম"; "fette biscottate" → "টোস্ট বিস্কুট".

## Albanese (sq)

- Nomi dei pesci poco sicuri: "platesë" per platessa, "gjuhëz deti" per sogliola, "koc" per orata.
- "Bieta" → "pazi"; "verdura cruda" → "perime të pagatuara".
- "Yogurt" → "kos" (anche "kos për të pirë" per lo yogurt da bere): verificare che sia la parola più naturale.

## Arabo (ar)

- Lessico tra arabo standard e levantino: "كوسا" (zucchine), "بطاطس" (patate), "آيس كريم".
- "Saltato" → "سوتيه" (prestito dal francese); "gratinato" → "غراتان".
- "Pesce halibut" → "هلبوت"; "trota" → "سلمون مرقط".

## Urdu (ur)

- "Fette biscottate" → "رس" (rusk); "basilico" → "نیازبو"; "zucchine" → "زوکینی".
- "Crema di …" → "گاڑھا سوپ"; "uova strapazzate" → "انڈا بھرجی".
- Traslitterazione dei formati di pasta da verificare.

## Interfaccia (`public/lingue/<lingua>.json`)

Anche i testi della pagina non sono stati rivisti da madrelingua.

### Tutte le lingue

- **Pulsanti di sistema** (iOS, Android/Chrome, Google Calendar, Outlook web): dove il nome tradotto non è sicuro c'è il nome inglese tra parentesi, es. "… (Subscribe)". Il percorso delle Impostazioni di iOS è tradotto e ripetuto in inglese tra parentesi (tranne in cinese). Molti genitori avranno comunque il telefono in italiano: si potrebbe aggiungere anche il nome italiano.
- **Tradotti senza inglese** perché ragionevolmente sicuri: cinese "订阅", "共享", "添加到主屏幕", "添加", percorso iOS "设置 → 日历 → 账户 → 添加账户 → 其他 → 添加已订阅的日历"; arabo "مشاركة", "إضافة إلى الشاشة الرئيسية", "إضافة".
- **"Nido"** è reso come servizio 0–3 anni: ro "creșă", zh "托儿所", bn "ডে-কেয়ার", sq "çerdhe", ar "حضانة", ur "ڈے کیئر". In bengalese e urdu si evita "nursery/নার্সারি/نرسری", che nel paese d'origine è una classe della scuola (3–4 anni). "Nido integrato" è reso alla lettera ("integrata", "مربوط"…), in arabo "حضانة ملحقة بروضة" (annesso alla scuola dell'infanzia): da verificare.
- **"Secondaria"** è la secondaria di primo grado: ro "gimnaziu", zh "初中", bn "নিম্ন মাধ্যমিক", sq "e mesme e ulët", ar "إعدادي", ur "مڈل".
- **"Veicolato"** reso come "pasti portati da una cucina centrale"; nelle forme brevi solo "portati".

### Rumeno (ro)

- Forma di cortesia con il plurale ("Căutați", "Alegeți", "dumneavoastră") in tutta la pagina.
- "Comune di Padova" → "Primăria Padova".

### Cinese (zh)

- Google Calendar "其他日历" e "通过网址添加" non verificati (hanno l'inglese accanto). "移除提醒" (Remove Alerts) non verificato.
- La barra in basso usa "月历" per *Mese*.

### Bengalese (bn)

- Cifre bengalesi nei testi fissi (২টি, ৭:০০, ২৪), come fa Intl per le date; ma i numeri di "settimana 3 di 4" arrivano dal codice e restano in cifre latine.
- iOS non è sicuro che esista in bengalese: nomi dei pulsanti tutti con l'inglese.

### Albanese (sq)

- iOS non ha l'albanese: nomi dei pulsanti tradotti per orientarsi, con l'inglese.
- Nel Chrome di prova (headless, macOS) le date in albanese escono in italiano ("martedì 10 novembre"): Intl non ha i dati `sq` e ripiega. Non dipende dalle traduzioni.

### Arabo (ar) e urdu (ur)

- **Frecce →** nei percorsi (Impostazioni → Calendario …): conservate come richiesto, ma in una frase da destra a sinistra puntano al contrario del verso di lettura. Valutare "←" per arabo e urdu.
- I nomi inglesi tra parentesi dentro il testo arabo/urdu si leggono, ma l'ordine visivo di parentesi e frecce può confondere: è il punto più delicato da far rivedere.
- "In alto a destra" per il menu ⋮ di Chrome è diventato "in alto": con il telefono in arabo o urdu il menu sta a sinistra.
- Arabo standard; "Comune di Padova" → "بلدية بادوفا", "secondaria" → "إعدادي" (uso marocchino ed egiziano).
- Urdu: numeri in cifre latine, come nei siti pakistani. Nel Chrome di prova si vede in naskh (nessun font nastaliq installato): leggibile ma meno naturale.
