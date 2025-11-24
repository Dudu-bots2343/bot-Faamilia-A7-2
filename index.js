// ===================== KEEP ALIVE =====================
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo!"));
app.listen(3000, () => console.log("Keep alive rodando!"));

// ===================== DOTENV =====================
require("dotenv").config();

// ===================== DISCORD =====================
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
  PermissionsBitField,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===================== ENV =====================
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;
const PREFIX = "!"; // caso queira mudar
const TOKEN = process.env.TOKEN;

// ===================== BOT ONLINE =====================
client.on("ready", async () => {
  console.log(`Bot ligado como ${client.user.tag}`);

  const canal = await client.channels.fetch(CANAL_PEDIR_SET);

  const embed = new EmbedBuilder()
    .setTitle("Sistema Familia A7")
    .setDescription(
      "Registro A7.\n\nSolicite Set usando o botão abaixo.\nRegistre-se abaixo."
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

  // ========= APROVAR =========
  if (acao === "aprovar") {
    try {
      await membro.setNickname(`A7 ${nomeInformado}`);

      await membro.roles.add([
        CARGO_APROVADO,
        CARGO_APROVADO_2,
      ]);

      const aprovadoEmbed = new EmbedBuilder()
        .setTitle("Registro Aprovado")
        .setColor("#00ff88")
        .setThumbnail(membro.user.displayAvatarURL())
        .addFields(
          { name: "👤 Usuário", value: `${membro}` },
          { name: "📛 Nome Informado", value: nomeInformado },
          { name: "☑ Aprovado por", value: `${interaction.user}` }
        )
        .setDescription("Aprovado com sucesso!");

      await interaction.reply({ embeds: [aprovadoEmbed] });

    } catch (e) {
      console.log(e);
      await interaction.reply({
        content: "❌ Erro ao aprovar. Permissões insuficientes.",
        ephemeral: true,
      });
    }
  }

  // ========= NEGAR =========
  if (acao === "negar") {
    try {
      await membro.kick("Registro negado.");

      await interaction.reply({
        content: `❌ Registro negado! O usuário **${membro.user.tag}** foi expulso.`,
      });

    } catch (e) {
      console.log(e);
      await interaction.reply({
        content: "❌ Não consegui expulsar o usuário. Permissões insuficientes.",
        ephemeral: true,
      });
    }
  }
});

// ===================== ADDCARGO / REMOVERCARGO =====================
client.on("messageCreate", async message => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // =================== USE: !addcargo @cargo @pessoa ===================
  if (cmd === "addcargo") {
    const cargo = message.mentions.roles.first();
    const pessoa = message.mentions.members.first();

    if (!cargo || !pessoa) {
      return message.reply("❌ Use: `!addcargo @cargo @pessoa`").then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 3000);
      });
    }

    const autor = message.member;

    if (cargo.position >= autor.roles.highest.position)
      return message.reply("❌ Você não pode setar um cargo igual ou maior que o seu.")
        .then(msg => setTimeout(() => msg.delete(), 3000));

    await pessoa.roles.add(cargo);

    const embed = new EmbedBuilder()
      .setTitle("Família A7")
      .setColor("#00ff99")
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: "Cargo:", value: `${cargo}` },
        { name: "Cargo setado em:", value: `${pessoa}` },
        { name: "Quem setou:", value: `${autor}` }
      );

    await message.reply({ embeds: [embed] });
  }

  // =================== USE: !removercargo @cargo @pessoa ===================
  if (cmd === "removercargo") {
    const cargo = message.mentions.roles.first();
    const pessoa = message.mentions.members.first();

    if (!cargo || !pessoa) {
      return message.reply("❌ Use: `!removercargo @cargo @pessoa`").then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 3000);
      });
    }

    const autor = message.member;

    if (cargo.position >= autor.roles.highest.position)
      return message.reply("❌ Você não pode remover um cargo igual ou maior que o seu.")
        .then(msg => setTimeout(() => msg.delete(), 3000));

    await pessoa.roles.remove(cargo);

    const embed = new EmbedBuilder()
      .setTitle("Família A7")
      .setColor("#ff5555")
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { name: "Cargo removido:", value: `${cargo}` },
        { name: "Cargo removido de:", value: `${pessoa}` },
        { name: "Quem removeu:", value: `${autor}` }
      );

    await message.reply({ embeds: [embed] });
  }
});

// ===================== LOGIN =====================
client.login(TOKEN);


