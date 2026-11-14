/* Conservative phrase signals, never a runtime or safety verdict. */
(() => {
  function summarize(rows){
    const result={total:rows.length,positive:0,negative:0,ban:0};
    for(const row of rows){
      const text=String(row.body??row.text??'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if(/[?¿]/.test(text)||/\b(si funciona|if it works|dicen que|they say|does not work\?|not patched|not banned|no esta parcheado|no me banearon)\b/.test(text))continue;
      if(/\b(no funciona|ya no sirve|parcheado|no me funciona|not working|doesn.t work|does not work|patched|broken|stopped working)\b/.test(text))result.negative++;
      else if(/\b(me funciona|funciona bien|funciona perfecto|works for me|working fine|still works|it works)\b/.test(text))result.positive++;
      if(/\b(me banearon|i got banned|got me banned)\b/.test(text))result.ban++;
    }
    return result;
  }
  globalThis.RCCReviewSignals={summarize};
})();
