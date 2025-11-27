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
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ------------------------- /doar -------------------------
  if (interaction.commandName === "doar") {
    const quantia = interaction.options.getInteger("quantia");
    const canal = interaction.guild.channels.cache.get(CANAL_APROVAR_DOACAO);

    if (!canal) return interaction.reply({ content: "Canal de aprovação não encontrado!", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("📥 Nova solicitação de doação")
      .setDescription(`Usuário: <@${interaction.user.id}>\nValor: **${quantia.toLocaleString()}**`)
      .setColor("#00aaff");

    const msg = await canal.send({ embeds: [embed] });
    msg.react("✅");

    return interaction.reply({ content: "Seu pedido de doação foi enviado!", ephemeral: true });
  }

  // ------------------------- /aprovar ------------------------
  if (interaction.commandName === "aprovar") {
    return interaction.reply({
      content: "Para aprovar clique no emoji **✅** nas mensagens do canal de aprovação.",
      ephemeral: true
    });
  }
});


// ==========================================================
// =================== APROVAR PELO REACT ===================
// ==========================================================
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.channel.id !== CANAL_APROVAR_DOACAO) return;
  if (reaction.emoji.name !== "✅") return;

  const embed = reaction.message.embeds[0];
  if (!embed) return;

  const userId = embed.description.match(/<@(\d+)>/)[1];
  const quantia = parseInt(
    embed.description
      .split("Valor: **")[1]
      .replace(/\D/g, "")
  );

  // Somar total da meta
  data.total += quantia;

  // Atualizar jogador
  if (!data.jogadores[userId]) data.jogadores[userId] = 0;
  data.jogadores[userId] += quantia;

  salvar();
  atualizarRanking();

  reaction.message.delete();
});


// ==========================================================
// ==================== RANKING AUTOMÁTICO ==================
// ==========================================================
function gerarBarra() {
  const progresso = data.total / parseInt(META_TOTAL);
  const porcentagem = Math.min(100, Math.floor(progresso * 100));

  const barras = Math.floor(porcentagem / 5);
  return "█".repeat(barras) + "░".repeat(20 - barras);
}

async function atualizarRanking() {
  const canal = client.channels.cache.get(CANAL_RANKING);
  if (!canal) return;

  const top = Object.entries(data.jogadores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, valor], i) => `**${i + 1}. <@${id}> — ${valor.toLocaleString()}**`)
    .join("\n");

  const embed = new EmbedBuilder()
    .setTitle("🏆 Ranking de Doadores")
    .setDescription(top || "Nenhuma doação ainda")
    .addFields({
      name: "📊 Progresso da Meta",
      value: `${gerarBarra()}\n${data.total.toLocaleString()}/${parseInt(META_TOTAL).toLocaleString()}`
    })
    .setColor("#ffaa00");

  canal.bulkDelete(10).catch(() => {});
  canal.send({ embeds: [embed] });
}


// ==========================================================
// ======================== LOGIN ===========================
// ==========================================================
client.login(TOKEN);
