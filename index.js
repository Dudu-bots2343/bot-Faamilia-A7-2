// ====================== KEEP ALIVE ======================
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo e rodando 24h! 🚀"));
app.listen(3000, () => console.log("🌐 KeepAlive ativo na porta 3000!"));


// ====================== DOTENV ==========================
require("dotenv").config();


// ====================== DISCORD.JS ======================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  SlashCommandBuilder,
  PermissionFlagsBits,
  Partials
} = require("discord.js");

const fs = require("fs");
const path = require("path");


// ====================== CLIENT ==========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});


// ====================== VARIÁVEIS .ENV ==================
const {
  CANAL_PEDIR_SET,
  CANAL_ACEITA_SET,
  CARGO_APROVADO,
  CARGO_APROVADO_2,
  CANAL_PEDIR_DOACAO,
  CANAL_APROVAR_DOACAO,
  CANAL_RANKING,
  META_TOTAL,
  TOKEN,
  GUILD_ID
} = process.env;


// ==========================================================
// ========================= DATABASE ========================
// ==========================================================
let data = { total: 0, jogadores: {} };

if (fs.existsSync("./dados.json")) {
  data = JSON.parse(fs.readFileSync("./dados.json", "utf8"));
}

function salvar() {
  fs.writeFileSync("./dados.json", JSON.stringify(data, null, 2));
}


// ==========================================================
// ======================== BOT ONLINE =======================
// ==========================================================
client.on("ready", async () => {
  console.log(`🤖 Bot ligado como ${client.user.tag}`);

  // ======= Mensagem de Registro (SET) =======
  const canalSet = await client.channels.fetch(CANAL_PEDIR_SET);

  const embed = new EmbedBuilder()
    .setTitle("Sistema Família A7")
    .setDescription(
      "Registro A7.\n\n Solicite SET usando o botão abaixo.\nPreencha com atenção!"
    )
    .addFields({
      name: "📌 Observações",
      value: `• A resenha aqui é garantida.\n• Não leve tudo a sério.`,
    })
    .setColor("#f1c40f");

  const btn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrirRegistro")
      .setLabel("Registro")
      .setStyle(ButtonStyle.Primary)
  );

  await canalSet.send({ embeds: [embed], components: [btn] });


  // ======= Mensagem de DOAÇÃO =======
  const canalDoar = await client.channels.fetch(CANAL_PEDIR_DOACION);

  const embedDoar = new EmbedBuilder()
    .setTitle("Sistema de Doações 💰")
    .setDescription(
      "Clique no botão abaixo para registrar uma **nova doação**.\nApós isso, um STAFF irá aprovar."
    )
    .setColor("#e67e22");

  const btnDoar = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrirDoacao")
      .setLabel("Registrar Doação")
      .setStyle(ButtonStyle.Success)
  );

  await canalDoar.send({ embeds: [embedDoar], components: [btnDoar] });

  // Registrar Slash Commands
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    const commands = [
      new SlashCommandBuilder()
        .setName("doar")
        .setDescription("Enviar um pedido de doação")
        .addIntegerOption(opt =>
          opt.setName("quantia").setDescription("Valor da doação").setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName("aprovar")
        .setDescription("Aprovar doações pendentes")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    ];

    await guild.commands.set(commands);
  }

  atualizarRanking();

  console.log("📩 Mensagens enviadas (SET + Doações)");
});


// ==========================================================
// ======================= SISTEMA SET =======================
// ==========================================================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "abrirRegistro") return;

  const modal = new ModalBuilder()
    .setCustomId("modalRegistro")
    .setTitle("Solicitação de Set");

  const nome = new TextInputBuilder()
    .setCustomId("nome")
    .setLabel("Seu nome *")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const id = new TextInputBuilder()
    .setCustomId("iduser")
    .setLabel("Seu ID *")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nome),
    new ActionRowBuilder().addComponents(id)
  );

  await interaction.showModal(modal);
});


client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "modalRegistro") return;

  const nome = interaction.fields.getTextInputValue("nome");
  const iduser = interaction.fields.getTextInputValue("iduser");

  const canal = await client.channels.fetch(CANAL_ACEITA_SET);

  const embed = new EmbedBuilder()
    .setTitle("Novo Pedido de Registro")
    .setColor("#3498db")
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "Usuário", value: `${interaction.user}` },
      { name: "Nome Informado", value: nome },
      { name: "ID Informado", value: iduser },
      {
        name: "Conta Criada em",
        value: `<t:${Math.floor(
          interaction.user.createdTimestamp / 1000
        )}:R>`
      }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar_${interaction.user.id}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`negar_${interaction.user.id}`)
      .setLabel("Negar")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({ embeds: [embed], components: [row] });

  await interaction.reply({ content: "Seu pedido foi enviado!", ephemeral: true });
});


client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [acao, userId] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  const membro = await interaction.guild.members.fetch(userId);
  const embedOriginal = interaction.message.embeds[0];

  const nomeInformado = embedOriginal.fields.find(f => f.name === "Nome Informado")?.value;
  const idInformado = embedOriginal.fields.find(f => f.name === "ID Informado")?.value;

  if (acao === "aprovar") {
    try {
      await membro.setNickname(`A7 ${nomeInformado}`);
      await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]);

      const msg = `
<:Design_sem_nomeremovebgpreview:1429140408641781871>  **Set Aprovado! Bem-vindo à Family A7!** <:emojia7:1429141492080967730>

Parabéns! Seu set foi oficialmente aceito e agora você faz parte da Family A7!

✨ **Seja muito bem-vindo!** ✨
      `;

      await membro.send(msg).catch(() => {});

      const embedAprovado = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Registro Aprovado")
        .addFields(
          { name: "👤 Usuário:", value: `${membro}` },
          { name: "🪪 ID:", value: `${idInformado}` },
          { name: "📛 Nome Informado:", value: `A7 ${nomeInformado}` },
          { name: "🧭 Acesso aprovado por:", value: `${interaction.user}` }
        );

      await interaction.update({ embeds: [embedAprovado], components: [] });

    } catch (e) {
      return interaction.reply({ content: "❌ Erro ao aprovar.", ephemeral: true });
    }
  }

  if (acao === "negar") {
    try {
      await membro.kick("Registro negado.");
      const embedNegado = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Registro Negado")
        .setDescription(`❌ O usuário **${membro.user.tag}** foi expulso.`);

      await interaction.update({ embeds: [embedNegado], components: [] });

    } catch (e) {
      return interaction.reply({ content: "❌ Não consegui expulsar.", ephemeral: true });
    }
  }
});


// ==========================================================
// ===================== SISTEMA DOAÇÕES ====================
// ==========================================================

// ====================== KEEP ALIVE ======================
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo e rodando 24h! 🚀"));
app.listen(3000, () => console.log("🌐 KeepAlive ativo na porta 3000!"));


// ====================== DOTENV ==========================
require("dotenv").config();


// ====================== DISCORD.JS ======================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  SlashCommandBuilder,
  PermissionFlagsBits,
  Partials
} = require("discord.js");

const fs = require("fs");
const path = require("path");


// ====================== CLIENT ==========================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});


// ====================== VARIÁVEIS .ENV ==================
const {
  CANAL_PEDIR_SET,
  CANAL_ACEITA_SET,
  CARGO_APROVADO,
  CARGO_APROVADO_2,
  CANAL_PEDIR_DOACAO,
  CANAL_APROVAR_DOACAO,
  CANAL_RANKING,
  META_TOTAL,
  TOKEN,
  GUILD_ID
} = process.env;


// ==========================================================
// ========================= DATABASE ========================
// ==========================================================
let data = { total: 0, jogadores: {} };

if (fs.existsSync("./dados.json")) {
  data = JSON.parse(fs.readFileSync("./dados.json", "utf8"));
}

function salvar() {
  fs.writeFileSync("./dados.json", JSON.stringify(data, null, 2));
}


// ==========================================================
// ======================== BOT ONLINE =======================
// ==========================================================
client.on("ready", async () => {
  console.log(`🤖 Bot ligado como ${client.user.tag}`);

  // ======= Mensagem de Registro (SET) =======
  const canalSet = await client.channels.fetch(CANAL_PEDIR_SET);

  const embed = new EmbedBuilder()
    .setTitle("Sistema Família A7")
    .setDescription(
      "Registro A7.\n\n Solicite SET usando o botão abaixo.\nPreencha com atenção!"
    )
    .addFields({
      name: "📌 Observações",
      value: `• A resenha aqui é garantida.\n• Não leve tudo a sério.`,
    })
    .setColor("#f1c40f");

  const btn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrirRegistro")
      .setLabel("Registro")
      .setStyle(ButtonStyle.Primary)
  );

  await canalSet.send({ embeds: [embed], components: [btn] });


  // ======= Mensagem de DOAÇÃO =======
  const canalDoar = await client.channels.fetch(CANAL_PEDIR_DOACION);

  const embedDoar = new EmbedBuilder()
    .setTitle("Sistema de Doações 💰")
    .setDescription(
      "Clique no botão abaixo para registrar uma **nova doação**.\nApós isso, um STAFF irá aprovar."
    )
    .setColor("#e67e22");

  const btnDoar = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrirDoacao")
      .setLabel("Registrar Doação")
      .setStyle(ButtonStyle.Success)
  );

  await canalDoar.send({ embeds: [embedDoar], components: [btnDoar] });

  // Registrar Slash Commands
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    const commands = [
      new SlashCommandBuilder()
        .setName("doar")
        .setDescription("Enviar um pedido de doação")
        .addIntegerOption(opt =>
          opt.setName("quantia").setDescription("Valor da doação").setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName("aprovar")
        .setDescription("Aprovar doações pendentes")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    ];

    await guild.commands.set(commands);
  }

  atualizarRanking();

  console.log("📩 Mensagens enviadas (SET + Doações)");
});


// ==========================================================
// ======================= SISTEMA SET =======================
// ==========================================================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "abrirRegistro") return;

  const modal = new ModalBuilder()
    .setCustomId("modalRegistro")
    .setTitle("Solicitação de Set");

  const nome = new TextInputBuilder()
    .setCustomId("nome")
    .setLabel("Seu nome *")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const id = new TextInputBuilder()
    .setCustomId("iduser")
    .setLabel("Seu ID *")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nome),
    new ActionRowBuilder().addComponents(id)
  );

  await interaction.showModal(modal);
});


client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "modalRegistro") return;

  const nome = interaction.fields.getTextInputValue("nome");
  const iduser = interaction.fields.getTextInputValue("iduser");

  const canal = await client.channels.fetch(CANAL_ACEITA_SET);

  const embed = new EmbedBuilder()
    .setTitle("Novo Pedido de Registro")
    .setColor("#3498db")
    .setThumbnail(interaction.user.displayAvatarURL())
    .addFields(
      { name: "Usuário", value: `${interaction.user}` },
      { name: "Nome Informado", value: nome },
      { name: "ID Informado", value: iduser },
      {
        name: "Conta Criada em",
        value: `<t:${Math.floor(
          interaction.user.createdTimestamp / 1000
        )}:R>`
      }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovar_${interaction.user.id}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`negar_${interaction.user.id}`)
      .setLabel("Negar")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({ embeds: [embed], components: [row] });

  await interaction.reply({ content: "Seu pedido foi enviado!", ephemeral: true });
});


client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [acao, userId] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  const membro = await interaction.guild.members.fetch(userId);
  const embedOriginal = interaction.message.embeds[0];

  const nomeInformado = embedOriginal.fields.find(f => f.name === "Nome Informado")?.value;
  const idInformado = embedOriginal.fields.find(f => f.name === "ID Informado")?.value;

  if (acao === "aprovar") {
    try {
      await membro.setNickname(`A7 ${nomeInformado}`);
      await membro.roles.add([CARGO_APROVADO, CARGO_APROVADO_2]);

      const msg = `
<:Design_sem_nomeremovebgpreview:1429140408641781871>  **Set Aprovado! Bem-vindo à Family A7!** <:emojia7:1429141492080967730>

Parabéns! Seu set foi oficialmente aceito e agora você faz parte da Family A7!

✨ **Seja muito bem-vindo!** ✨
      `;

      await membro.send(msg).catch(() => {});

      const embedAprovado = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Registro Aprovado")
        .addFields(
          { name: "👤 Usuário:", value: `${membro}` },
          { name: "🪪 ID:", value: `${idInformado}` },
          { name: "📛 Nome Informado:", value: `A7 ${nomeInformado}` },
          { name: "🧭 Acesso aprovado por:", value: `${interaction.user}` }
        );

      await interaction.update({ embeds: [embedAprovado], components: [] });

    } catch (e) {
      return interaction.reply({ content: "❌ Erro ao aprovar.", ephemeral: true });
    }
  }

  if (acao === "negar") {
    try {
      await membro.kick("Registro negado.");
      const embedNegado = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Registro Negado")
        .setDescription(`❌ O usuário **${membro.user.tag}** foi expulso.`);

      await interaction.update({ embeds: [embedNegado], components: [] });

    } catch (e) {
      return interaction.reply({ content: "❌ Não consegui expulsar.", ephemeral: true });
    }
  }
});


// ==========================================================
// ===================== SISTEMA DOAÇÕES ====================
// ==========================================================

// ===== Slash Commands =====
cconst {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
require("dotenv").config();
const fs = require("fs");

// =========================
// CONFIGURAÇÕES DO BOT
// =========================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// =========================
// VARIÁVEIS DO SISTEMA DE DOAÇÃO
// =========================
const CANAL_PEDIR = process.env.CANAL_PEDIR_DOACAO;
const CANAL_APROVAR = process.env.CANAL_APROVAR_DOACAO;
const CANAL_RANKING = process.env.CANAL_RANKING; // você mandou: 1443487844793454743
const META_TOTAL = Number(process.env.META_TOTAL);

let totalDoacoes = 0;
let ranking = {}; // usuário: totalDoado

// =========================
// ARQUIVOS PARA SALVAR DADOS
// =========================
const pathBD = "./doacoes.json";

if (!fs.existsSync(pathBD)) {
    fs.writeFileSync(pathBD, JSON.stringify({ totalDoacoes: 0, ranking: {} }, null, 2));
}

function salvar() {
    fs.writeFileSync(
        pathBD,
        JSON.stringify({ totalDoacoes, ranking }, null, 2)
    );
}

function carregarBD() {
    let data = JSON.parse(fs.readFileSync(pathBD));
    totalDoacoes = data.totalDoacoes || 0;
    ranking = data.ranking || {};
}

carregarBD();

// =========================
// FUNÇÃO DE BARRA DE PROGRESSO
// =========================
function gerarBarra(atual, meta) {
    const total = 20;
    let completo = Math.floor((atual / meta) * total);
    let vazio = total - completo;

    return "▰".repeat(completo) + "▱".repeat(vazio);
}

// =========================
// ATUALIZAR CANAL DE RANKING
// =========================
async function atualizarRanking() {
    const canal = await client.channels.fetch(CANAL_RANKING).catch(() => null);
    if (!canal) return;

    const top = Object.entries(ranking)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    let descrição = top.length
        ? top.map((v, i) => `**${i + 1}. <@${v[0]}> — ${v[1].toLocaleString()}**`).join("\n")
        : "Sem doações registradas ainda.";

    const embed = new EmbedBuilder()
        .setTitle("🏆 Ranking de Doações — Top 10")
        .setColor("Gold")
        .setDescription(descrição)
        .addFields({
            name: "📊 Progresso da Meta",
            value: `${gerarBarra(totalDoacoes, META_TOTAL)}\n**${totalDoacoes.toLocaleString()} / ${META_TOTAL.toLocaleString()}**`,
        })
        .setTimestamp();

    canal.messages.fetch().then(async msgs => {
        if (msgs.size === 0) {
            await canal.send({ embeds: [embed] });
        } else {
            await msgs.first().edit({ embeds: [embed] }).catch(() => null);
        }
    });
}

// =========================
// SISTEMA DE PEDIR DOAÇÃO
// =========================
client.on("messageCreate", async (msg) => {
    if (msg.channel.id !== CANAL_PEDIR) return;
    if (msg.author.bot) return;

    let valor = Number(msg.content.replace(/[^\d]/g, ""));
    if (!valor || valor <= 0) return;

    const canalAprovar = await client.channels.fetch(CANAL_APROVAR);
    if (!canalAprovar) return;

    const embed = new EmbedBuilder()
        .setTitle("💰 Nova Doação Aguardando Aprovação")
        .setColor("Yellow")
        .setDescription(`**Usuário:** <@${msg.author.id}>\n**Valor:** ${valor.toLocaleString()}`)
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`aprovar-${msg.author.id}-${valor}`)
            .setLabel("Aprovar")
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`negar-${msg.author.id}-${valor}`)
            .setLabel("Negar")
            .setStyle(ButtonStyle.Danger),
    );

    await canalAprovar.send({ embeds: [embed], components: [row] });
    await msg.reply("📥 Sua doação foi enviada para aprovação!").then(m => setTimeout(() => m.delete().catch(() => null), 5000));

    msg.delete().catch(() => null);
});

// =========================
// SISTEMA DE APROVAR DOAÇÃO
// =========================
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const [acao, userId, valorStr] = interaction.customId.split("-");
    const valor = Number(valorStr);

    if (!valor || !userId) return;

    if (acao === "aprovar") {
        totalDoacoes += valor;

        if (!ranking[userId]) ranking[userId] = 0;
        ranking[userId] += valor;

        salvar();
        atualizarRanking();

        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle("✅ Doação Aprovada")
                    .setColor("Green")
                    .setDescription(`Doação de <@${userId}> no valor de **${valor.toLocaleString()}** foi aprovada!`)
            ],
            components: []
        });
    }

    if (acao === "negar") {
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setTitle("❌ Doação Negada")
                    .setColor("Red")
                    .setDescription(`A doação de <@${userId}> foi negada.`)
            ],
            components: []
        });
    }
});

// =========================
// SISTEMA DE SET (NÃO ALTERADO)
// =========================
// Aqui fica exatamente o sistema de set que você já tinha
// Me avise caso queira que eu cole ele aqui também dentro desse arquivo

// =========================
// BOT ONLINE
// =========================
client.once("ready", async () => {
    console.log(`Bot online como ${client.user.tag}!`);
    atualizarRanking();
});

client.login(process.env.BOT_TOKEN);


