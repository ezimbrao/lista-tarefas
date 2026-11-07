const form = document.querySelector('#form-tarefa');
const campo = document.querySelector('#campo-tarefa');
const campoPrazo = document.querySelector('#campo-prazo');
const lista = document.querySelector('#lista');
const vazio = document.querySelector('#vazio');
const contador = document.querySelector('#contador');
const botoesFiltro = document.querySelectorAll('[data-filtro]');
const botaoLimparConcluidas = document.querySelector('#limpar-concluidas');

const CHAVE = 'tarefas-v1';
let tarefas = carregar();
let filtroAtual = 'todas';
let temporizadorCliqueTexto;

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    return [];
  }
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(tarefas));
  } catch {
    // sem localStorage: o app continua funcionando
  }
}

function converterPrazoParaISO(valor) {
  if (!valor) return '';

  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!partes) return null;

  const dia = Number(partes[1]);
  const mes = Number(partes[2]);
  const ano = Number(partes[3]);
  const data = new Date(0);
  data.setUTCHours(0, 0, 0, 0);
  data.setUTCFullYear(ano, mes - 1, dia);

  if (
    ano < 1 ||
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }

  return `${partes[3]}-${partes[2]}-${partes[1]}`;
}

function formatarPrazo(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '';
}

function tarefasVisiveis() {
  if (filtroAtual === 'pendentes') return tarefas.filter((t) => !t.concluida);
  if (filtroAtual === 'concluidas') return tarefas.filter((t) => t.concluida);
  return tarefas;
}

function criarItem(tarefa) {
  const li = document.createElement('li');
  li.className = 'item';
  li.dataset.id = tarefa.id;
  if (tarefa.concluida) li.classList.add('item--concluida');

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.id = `chk-${tarefa.id}`;
  check.checked = tarefa.concluida;

  const texto = document.createElement('label');
  texto.htmlFor = check.id;
  texto.textContent = tarefa.texto;

  const prazo = document.createElement('input');
  prazo.type = 'text';
  prazo.className = 'prazo';
  prazo.inputMode = 'numeric';
  prazo.placeholder = 'dd/mm/aaaa';
  prazo.value = formatarPrazo(tarefa.prazo);
  prazo.setAttribute('aria-label', `Prazo da tarefa: ${tarefa.texto}`);

  const remover = document.createElement('button');
  remover.type = 'button';
  remover.className = 'remover';
  remover.dataset.acao = 'remover';
  remover.setAttribute('aria-label', `Remover tarefa: ${tarefa.texto}`);
  remover.textContent = '×';

  li.append(check, texto, prazo, remover);
  return li;
}

function renderizar() {
  const visiveis = [...tarefasVisiveis()].sort(
    (a, b) => Number(a.concluida) - Number(b.concluida)
  );
  lista.replaceChildren(...visiveis.map(criarItem));
  vazio.hidden = visiveis.length > 0;

  const pendentes = tarefas.filter((t) => !t.concluida).length;
  contador.textContent =
    pendentes === 1 ? '1 tarefa pendente' : `${pendentes} tarefas pendentes`;

  botoesFiltro.forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.filtro === filtroAtual))
  );
}

function editarTarefa(texto) {
  const li = texto.closest('.item');
  const tarefa = tarefas.find((t) => t.id === li.dataset.id);
  if (!tarefa) return;

  const editor = document.createElement('input');
  editor.type = 'text';
  editor.value = tarefa.texto;
  editor.setAttribute('aria-label', `Editar tarefa: ${tarefa.texto}`);
  texto.replaceWith(editor);
  editor.focus();
  editor.select();

  function finalizar(salvarEdicao) {
    if (editor.dataset.finalizado) return;
    editor.dataset.finalizado = 'true';

    if (salvarEdicao) {
      const novoTexto = editor.value.trim();
      if (novoTexto) tarefa.texto = novoTexto;
    }

    salvar();
    renderizar();
  }

  editor.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      finalizar(true);
    } else if (evento.key === 'Escape') {
      finalizar(false);
    }
  });
  editor.addEventListener('blur', () => finalizar(true));
}

form.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const texto = campo.value.trim();
  if (!texto) return;

  const prazo = converterPrazoParaISO(campoPrazo.value);
  if (prazo === null) {
    campoPrazo.setCustomValidity('Digite uma data válida no formato dd/mm/aaaa.');
    campoPrazo.reportValidity();
    return;
  }

  tarefas.push({
    id: String(Date.now()),
    texto,
    concluida: false,
    prazo,
  });
  campo.value = '';
  campoPrazo.value = '';
  campo.focus();
  salvar();
  renderizar();
});

lista.addEventListener('change', (evento) => {
  const li = evento.target.closest('.item');
  if (!li) return;

  const tarefa = tarefas.find((t) => t.id === li.dataset.id);
  if (!tarefa) return;

  if (evento.target.matches('.prazo')) {
    const prazo = converterPrazoParaISO(evento.target.value);
    if (prazo === null) {
      evento.target.setCustomValidity('Digite uma data válida no formato dd/mm/aaaa.');
      evento.target.reportValidity();
      evento.target.value = formatarPrazo(tarefa.prazo);
      return;
    }

    tarefa.prazo = prazo;
    salvar();
    return;
  }
  if (evento.target.type !== 'checkbox') return;

  tarefa.concluida = evento.target.checked;
  salvar();
  renderizar();
  lista.querySelector(`[data-id="${li.dataset.id}"] input`)?.focus();
});

campoPrazo.addEventListener('input', () => campoPrazo.setCustomValidity(''));

lista.addEventListener('input', (evento) => {
  if (evento.target.matches('.prazo')) evento.target.setCustomValidity('');
});

lista.addEventListener('click', (evento) => {
  const texto = evento.target.closest('.item label');
  if (texto) {
    evento.preventDefault();

    if (temporizadorCliqueTexto) clearTimeout(temporizadorCliqueTexto);
    if (evento.detail === 1) {
      const id = texto.closest('.item').dataset.id;
      temporizadorCliqueTexto = setTimeout(() => {
        temporizadorCliqueTexto = null;
        const tarefa = tarefas.find((t) => t.id === id);
        if (!tarefa) return;
        tarefa.concluida = !tarefa.concluida;
        salvar();
        renderizar();
      }, 500);
    }
    return;
  }

  const botao = evento.target.closest('[data-acao="remover"]');
  if (!botao) return;

  const id = botao.closest('.item').dataset.id;
  tarefas = tarefas.filter((t) => t.id !== id);
  salvar();
  renderizar();
});

lista.addEventListener('dblclick', (evento) => {
  const texto = evento.target.closest('.item label');
  if (!texto) return;

  evento.preventDefault();
  if (temporizadorCliqueTexto) {
    clearTimeout(temporizadorCliqueTexto);
    temporizadorCliqueTexto = null;
  }
  editarTarefa(texto);
});

botaoLimparConcluidas.addEventListener('click', () => {
  tarefas = tarefas.filter((t) => !t.concluida);
  salvar();
  renderizar();
});

botoesFiltro.forEach((botao) => {
  botao.addEventListener('click', () => {
    filtroAtual = botao.dataset.filtro;
    renderizar();
  });
});

renderizar();