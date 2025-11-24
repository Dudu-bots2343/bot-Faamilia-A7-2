// ===================== KEEP ALIVE =====================
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo!"));
app.listen(3000, () => console.log("Keep alive rodando!"));

// ===================== DOTENV =====================
require("dotenv").config();

// ===================== DISCORD BOT =====================
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
  Events
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

// ===================== ENV =====================
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;
const TOKEN = process.env.TOKEN;
const PREFIX = "!";

// ===================== BOT ONLINE =====================
client.on("ready", async () => {
  console.log(`Bot ligado como ${client.user.tag}`);

  const canal = await client.channels.fetch(CANAL_PEDIR_SET);

  const embed = new EmbedBuilder()
    .setTitle("Sistema Familia A7")
    .setDescription(
      "Registro A7.\n\n Solicite Set , usando os botões abaixo.\n Registre-se Abaixo."
    )
    .addFields({
      name: "📌 Observações",
      value: "• A resenha aqui é garantida.\n• Não leve a brincadeira a sério.",
    })
    .setColor("#f1c40f");

  const btn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrirRegistro")
      .setLabel("Registro")
      .setStyle(ButtonStyle.Primary)
  );

  await canal.send({ embeds: [embed], components: [btn] });
});

// ===================== ABRIR MODAL =====================
client.on(Events.InteractionCreate, async interaction => {
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

// ===================== RECEBER FORMULÁRIO =====================
client.on(Events.InteractionCreate, async interaction => {
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
        value: `<t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>`,
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

  await interaction.reply({
    content: "Seu pedido foi enviado!",
    ephemeral: true,
  });
});

// ===================== APROVAR / NEGAR =====================
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const [acao, userId] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  const membro = await interaction.guild.members.fetch(userId);
  const embed = interaction.message.embeds[0];
  const nomeInformado = embed.fields.find(f => f.name === "Nome Informado")?.value;

  // ===== APROVAR =====
  if (acao === "aprovar") {
    try {
      await membro.setNickname(`A7 ${nomeInformado}`);

      await membro.roles.add([
        CARGO_APROVADO,
        CARGO_APROVADO_2,
      ]);

      const aprovadoEmbed = new EmbedBuilder()
        .setTitle("SET APROVADO")
        .setColor("#00ff99")
        .setThumbnail(interaction.guild.iconURL())
        .addFields(
          { name: "Usuário:", value: `${membro}` },
          { name: "Novo Nick:", value: `A7 ${nomeInformado}` },
          { name: "Aprovado por:", value: `${interaction.user}` }
        );

      await interaction.update({ embeds: [aprovadoEmbed], components: [] });

    } catch (e) {
      await interaction.reply({
        content: "❌ Erro ao aprovar. Permissões insuficientes.",
        ephemeral: true,
      });
    }
  }

  // ===== NEGAR =====
  if (acao === "negar") {
    try {
      await membro.kick("Registro negado.");

      const negadoEmbed = new EmbedBuilder()
        .setTitle("REGISTRO NEGADO")
        .setColor("#ff3333")
        .setThumbnail(interaction.guild.iconURL())
        .addFields(
          { name: "Usuário:", value: `${membro.user.tag}` },
          { name: "Negado por:", value: `${interaction.user}` }
        );

      await interaction.update({ embeds: [negadoEmbed], components: [] });

    } catch (e) {
      await interaction.reply({
        content: "❌ Não consegui expulsar o usuário.",
        ephemeral: true,
      });
    }
  }
});

// ===================== ADD / REMOVER CARGO =====================
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  function getCargo(x) {
    return message.mentions.roles.first() || message.guild.roles.cache.get(x);
  }

  function getUser(x) {
    return message.mentions.members.first() || message.guild.members.cache.get(x);
  }

  // ===== ADD CARGO =====
  if (cmd === "addcargo") {
    if (args.length < 2)
      return message.reply("❌ Use: !addcargo @cargo @pessoa").then(m => setTimeout(() => m.delete(), 3000));

    const cargo = getCargo(args[0]);
    const pessoa = getUser(args[1]);

    if (!cargo || !pessoa)
      return message.reply("❌ Cargo ou pessoa inválidos.").then(m => setTimeout(() => m.delete(), 3000));

    if (cargo.position >= message.member.roles.highest.position)
      return message.reply("❌ Você não pode setar cargo igual ou maior que o seu.")
        .then(m => setTimeout(() => m.delete(), 3000));

    await pessoa.roles.add(cargo);

    const embed = new EmbedBuilder()
      .setTitle("Família A7 - Cargo Setado")
      .setColor("#00ff99")
      .setThumbnail(message.guild.iconURL())
      .addFields(
        { name: "Cargo:", value: `${cargo}` },
        { name: "Setado para:", value: `${pessoa}` },
        { name: "Por:", value: `${message.member}` }
      );

    return message.reply({ embeds: [embed] })
      .then(m => setTimeout(() => m.delete(), 20000));
  }

  // ===== REMOVER CARGO =====
  if (cmd === "removercargo") {
    if (args.length < 2)
      return message.reply("❌ Use: !removercargo @cargo @pessoa").then(m => setTimeout(() => m.delete(), 3000));

    const cargo = getCargo(args[0]);
    const pessoa = getUser(args[1]);

    if (!cargo || !pessoa)
      return message.reply("❌ Cargo ou pessoa inválidos.").then(m => setTimeout(() => m.delete(), 3000));

    if (cargo.position >= message.member.roles.highest.position)
      return message.reply("❌ Você não pode remover cargo igual ou maior que o seu.")
        .then(m => setTimeout(() => m.delete(), 3000));

    await pessoa.roles.remove(cargo);

    const embed = new EmbedBuilder()
      .setTitle("Família A7 - Cargo Removido")
      .setColor("#ff3333")
      .setThumbnail(message.guild.iconURL())
      .addFields(
        { name: "Cargo removido:", value: `${cargo}` },
        { name: "Removido de:", value: `${pessoa}` },
        { name: "Por:", value: `${message.member}` }
      );

    return message.reply({ embeds: [embed] })
      .then(m => setTimeout(() => m.delete(), 20000));
  }
});

// ===================== LOGIN =====================
client.login(TOKEN);
