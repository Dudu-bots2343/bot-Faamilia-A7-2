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
  ],
});

// ====================== VARIÁVEIS .ENV ==================
const {
  CANAL_PEDIR_SET,
  CANAL_ACEITA_SET,
  CARGO_APROVADO,
  CARGO_APROVADO_2,
  CANAL_PEDIR_DOACAO,
  CANAL_APROVAR_DOACAO,
  META_TOTAL,
  TOKEN
} = process.env;

// ====================== DATABASE DOAÇÕES =================
const dbPath = path.join(__dirname, "doacoes.json");

if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ total: 0, users: {} }, null, 2));
}

function loadDB() {
  return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// ====================== BOT ONLINE ======================
client.on("ready", async () => {
  console.log(`🤖 Bot ligado como ${client.user.tag}`);

  // ======= Mensagem de Registro =======
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

  // =========== Mensagem de DOAÇÃO ===========
  const canalDoar = await client.channels.fetch(CANAL_PEDIR_DOACAO);

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
        )}:R>`,
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

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "abrirDoacao") return;

  const modal = new ModalBuilder()
    .setCustomId("modalDoar")
    .setTitle("Registrar Doação");

  const valor = new TextInputBuilder()
    .setCustomId("valor")
    .setLabel("Valor da doação (somente números)")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  modal.addComponents(new ActionRowBuilder().addComponents(valor));

  await interaction.showModal(modal);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== "modalDoar") return;

  const valor = parseInt(interaction.fields.getTextInputValue("valor"));
  if (isNaN(valor)) return interaction.reply({ content: "Valor inválido.", ephemeral: true });

  const canal = await client.channels.fetch(CANAL_APROVAR_DOACAO);

  const embed = new EmbedBuilder()
    .setTitle("Nova Doação aguardando aprovação 💸")
    .addFields(
      { name: "Usuário", value: `${interaction.user}` },
      { name: "Valor", value: `${valor.toLocaleString("pt-BR")}` }
    )
    .setColor("#2ecc71");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`aprovarDoacao_${interaction.user.id}_${valor}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`negarDoacao_${interaction.user.id}`)
      .setLabel("Negar")
      .setStyle(ButtonStyle.Danger)
  );

  await canal.send({ embeds: [embed], components: [row] });

  await interaction.reply({ content: "Sua doação foi enviada para aprovação!", ephemeral: true });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [acao, userId, valor] = interaction.customId.split("_");

  if (!["aprovarDoacao", "negarDoacao"].includes(acao)) return;

  if (acao === "negarDoacao") {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("Doação Negada")
      .setDescription(`A doação foi recusada por ${interaction.user}.`);

    return interaction.update({ embeds: [embed], components: [] });
  }

  if (acao === "aprovarDoacao") {
    const val = Number(valor);
    const membro = await interaction.guild.members.fetch(userId);

    const db = loadDB();

    db.total += val;

    if (!db.users[userId]) db.users[userId] = 0;
    db.users[userId] += val;

    saveDB(db);

    const progresso = (db.total / META_TOTAL) * 100;

    const barra = "▰".repeat(progresso / 5) + "▱".repeat(20 - progresso / 5);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("Doação Aprovada ✔️")
      .addFields(
        { name: "Usuário", value: `${membro}` },
        { name: "Valor", value: `${val.toLocaleString("pt-BR")}` },
        { name: "Total Arrecadado", value: db.total.toLocaleString("pt-BR") },
        { name: "Meta", value: Number(META_TOTAL).toLocaleString("pt-BR") },
        { name: "Progresso", value: `${barra}\n${progresso.toFixed(2)}%` }
      );

    await interaction.update({ embeds: [embed], components: [] });
  }
});

client.login(TOKEN);
