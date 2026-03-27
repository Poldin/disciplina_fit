# Day Blocks — Guida ai tipi di blocco

I blocchi si inseriscono nel campo `metadata` di `message_schedule` (colonna `jsonb`), nell'array `blocks`.  
Il campo `message` rimane il testo principale (renderizzato dentro il box).  
I blocchi appaiono **fuori dal box**, nell'ordine in cui sono definiti.

```json
{
  "message": "Testo del messaggio principale...",
  "blocks": [ ...blocchi... ]
}
```

Le risposte dell'utente vengono salvate automaticamente nello stesso record, in `metadata.responses`:

```json
{
  "responses": {
    "mood_day3": 4,
    "notes_day3": "Oggi è stato difficile ma ce l'ho fatta."
  }
}
```

---

## `youtube` — Video YouTube

Mostra una thumbnail cliccabile. Al click si espande l'embed inline.

```json
{
  "type": "youtube",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

| Campo | Tipo   | Note                                            |
|-------|--------|-------------------------------------------------|
| `url` | string | Qualsiasi formato YouTube: `watch?v=`, `youtu.be/`, `embed/` |

---

## `markdown` — Testo formattato

Renderizza testo Markdown completo: titoli, grassetto, corsivo, liste, citazioni, separatori, ecc.

```json
{
  "type": "markdown",
  "content": "## Titolo\n\nTesto con **grassetto** e *corsivo*.\n\n- Punto 1\n- Punto 2\n\n> Una citazione ispirazionale"
}
```

| Campo     | Tipo   | Note                       |
|-----------|--------|----------------------------|
| `content` | string | Markdown completo, usa `\n` per andare a capo |

**Sintassi Markdown supportata:**

| Sintassi          | Risultato       |
|-------------------|-----------------|
| `**testo**`       | **grassetto**   |
| `*testo*`         | *corsivo*       |
| `## Titolo`       | Intestazione H2 |
| `### Titolo`      | Intestazione H3 |
| `- elemento`      | Lista puntata   |
| `1. elemento`     | Lista numerata  |
| `> testo`         | Citazione       |
| `---`             | Separatore      |
| `` `codice` ``    | Codice inline   |

---

## `rating` — Valutazione con emoji

L'utente sceglie tra 5 emoji (da 😢 a 😄). La risposta viene salvata automaticamente al click.

```json
{
  "type": "rating",
  "id": "mood_day3",
  "label": "Come ti sei sentito oggi?"
}
```

| Campo   | Tipo   | Obbligatorio | Note                                                  |
|---------|--------|:------------:|-------------------------------------------------------|
| `id`    | string | ✅           | Chiave univoca per salvare la risposta in `responses` |
| `label` | string | ❌           | Domanda mostrata sopra le emoji                       |

**Valori salvati:** `1` (😢 Molto male) → `2` (😕 Male) → `3` (😐 Così così) → `4` (🙂 Bene) → `5` (😄 Benissimo)

> ⚠️ L'`id` deve essere **univoco per messaggio** (e preferibilmente per giorno) per evitare collisioni in `responses`.

---

## `text_input` — Campo di testo libero

Textarea dove l'utente può scrivere. Compare un pulsante "Salva" quando il testo è stato modificato.

```json
{
  "type": "text_input",
  "id": "notes_day3",
  "label": "Le tue riflessioni",
  "placeholder": "Cosa hai vissuto oggi?"
}
```

| Campo         | Tipo   | Obbligatorio | Note                                                  |
|---------------|--------|:------------:|-------------------------------------------------------|
| `id`          | string | ✅           | Chiave univoca per salvare la risposta in `responses` |
| `label`       | string | ❌           | Etichetta mostrata sopra il campo                     |
| `placeholder` | string | ❌           | Testo grigio quando il campo è vuoto                  |

---

## Esempio completo

```json
{
  "message": "💪 Giorno 3. Questi sono i giorni più duri, ma significa che il cambiamento sta avvenendo. Il corpo sta disintossicandosi. Resisti!",
  "blocks": [
    {
      "type": "youtube",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      "type": "markdown",
      "content": "## Perché il giorno 3 è il più difficile\n\nIl tuo corpo ha esaurito le riserve di glicogeno e sta imparando a usare i grassi come carburante. Questo processo si chiama **adattamento metabolico**.\n\n### Cosa succede dentro di te\n\n- 🔥 Il metabolismo si sta **riorganizzando**\n- 🧠 Il cervello cerca ancora zucchero — è normale sentirsi stanchi\n- 💧 Stai perdendo acqua in eccesso: **idratati bene**\n\n> *\"Il momento in cui vuoi mollare è esattamente il momento in cui devi continuare.\"*\n\n---\n\nDomani sarà già diverso. Tienimi aggiornato! 🙌"
    },
    {
      "type": "rating",
      "id": "mood_day3",
      "label": "Come ti sei sentito oggi?"
    },
    {
      "type": "text_input",
      "id": "notes_day3",
      "label": "Le tue riflessioni",
      "placeholder": "Cosa hai vissuto oggi? Hai avuto tentazioni? Come le hai gestite?"
    }
  ]
}
```
