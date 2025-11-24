// ====================== KEEP ALIVE ======================
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo!"));
app.listen(3000, () => console.log("Keep alive rodando!"));

// ====================== DOTENV ==========================
require("dotenv").config();

// ====================== DISCORD.JS =======================
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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ====================== VARIÁVEIS DO .ENV =================
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;
const TOKEN = process.env.TOKEN;

// ====================== BOT ONLINE ========================
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
      value: `• A resenha aqui e garantida.\n• Não leve a brincadeira a sério.`,
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

// ====================== ABRIR MODAL ========================
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

// ====================== RECEBER FORM ========================
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

  await interaction.reply({
    content: "Seu pedido foi enviado!",
    ephemeral: true,
  });
});

// =================== APROVAR / NEGAR ===================
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [acao, userId] = interaction.customId.split("_");
  if (!["aprovar", "negar"].includes(acao)) return;

  const membro = await interaction.guild.members.fetch(userId);

  const embedOriginal = interaction.message.embeds[0];

  const nomeInformado = embedOriginal.fields.find(f => f.name === "Nome Informado")?.value;
  const idInformado = embedOriginal.fields.find(f => f.name === "ID Informado")?.value;

  // ========== APROVAR ==========
  if (acao === "aprovar") {
    try {
      await membro.setNickname(`A7 ${nomeInformado}`);

      await membro.roles.add([
        CARGO_APROVADO,
        CARGO_APROVADO_2,
      ]);

      const embedAprovado = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Registro Aprovado")
        .addFields(
          { name: "👤 Usuário:", value: `${membro}` },
          { name: "🪪 ID:", value: `${idInformado}` },
          { name: "📛 Nome Informado:", value: `A7 ${nomeInformado}` },
          { name: "🧭 Acesso aprovado por:", value: `${interaction.user}` }
        )
        .setThumbnail(embedOriginal.data.thumbnail?.url || membro.user.displayAvatarURL())
        .setFooter({ text: "Aprovado com sucesso!" });

      await interaction.update({
        embeds: [embedAprovado],
        components: []
      });

    } catch (e) {
      console.log(e);
      return interaction.reply({
        content: "❌ Erro ao aprovar. Verifique permissões.",
        ephemeral: true
      });
    }
  }

  // ========== NEGAR ==========
  if (acao === "negar") {
    try {
      await membro.kick("Registro negado pelo aprovador.");

      const embedNegado = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Registro Negado")
        .setDescription(`❌ O usuário **${membro.user.tag}** foi expulso.\nNegado por: ${interaction.user}`)
        .setThumbnail(membro.user.displayAvatarURL());

      await interaction.update({
        embeds: [embedNegado],
        components: []
      });

    } catch (e) {
      console.log(e);
      return interaction.reply({
        content: "❌ Não consegui expulsar o usuário.",
        ephemeral: true
      });
    }
  }
});
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require("discord.js");
require("dotenv").config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

client.on("ready", () => {
    console.log(`Bot online como ${client.user.tag}`);
});

// Função para extrair cargo e usuário de várias formas
function extractTargets(message, args) {
    let cargo =
        message.mentions.roles.first() ||
        message.guild.roles.cache.get(args[0]);

    let usuario =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[1]);

    return { cargo, usuario };
}

// Função para checar hierarquia
function canModify(message, cargo, usuario) {
    const autor = message.member;

    if (!cargo || !usuario) return false;

    if (cargo.position >= autor.roles.highest.position) return false;
    if (usuario.roles.highest.position >= autor.roles.highest.position) return false;

    return true;
}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const prefix = "!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    // ===========================
    // ADDCARGO
    // ===========================
    if (cmd === "addcargo") {
        const { cargo, usuario } = extractTargets(message, args);

        await message.delete().catch(() => {});

        if (!cargo || !usuario) {
            const erro = new EmbedBuilder()
                .setTitle("❌ Erro")
                .setDescription("Use: `!addcargo @cargo @pessoa` ou variações.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        if (!canModify(message, cargo, usuario)) {
            const erro = new EmbedBuilder()
                .setTitle("⚠️ Permissão Negada")
                .setDescription("Você **não pode setar esse cargo**.\nCargo igual/maior que o seu ou usuário com cargo maior.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        await usuario.roles.add(cargo).catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle("Família A7")
            .setColor("#00ff99")
            .setThumbnail("https://cdn.discordapp.com/icons/" + message.guild.id + "/" + message.guild.icon + ".png")
            .addFields(
                { name: "Cargo:", value: `${cargo} \n(${cargo.id})`, inline: false },
                { name: "Cargo setado com sucesso no:", value: `${usuario.user.username}_${usuario.user.discriminator}`, inline: false },
                { name: "Quem setou:", value: `${message.author}`, inline: false }
            );

        return message.channel.send({ embeds: [embed] });
    }

    // ===========================
    // REMOVERCARGO
    // ===========================
    if (cmd === "removercargo") {
        const { cargo, usuario } = extractTargets(message, args);

        await message.delete().catch(() => {});

        if (!cargo || !usuario) {
            const erro = new EmbedBuilder()
                .setTitle("❌ Erro")
                .setDescription("Use: `!removercargo @cargo @pessoa` ou variações.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        if (!canModify(message, cargo, usuario)) {
            const erro = new EmbedBuilder()
                .setTitle("⚠️ Permissão Negada")
                .setDescription("Você **não pode remover esse cargo**.\nCargo igual/maior que o seu ou usuário com cargo maior.")
                .setColor("Red")
                .setThumbnail(message.guild.iconURL());

            return message.channel.send({ embeds: [erro] }).then(msg => {
                setTimeout(() => msg.delete().catch(()=>{}), 20000);
            });
        }

        await usuario.roles.remove(cargo).catch(() => {});

        const embed = new EmbedBuilder()
            .setTitle("Família A7")
            .setColor("#ff4444")
            .setThumbnail("https://cdn.discordapp.com/icons/" + message.guild.id + "/" + message.guild.icon + ".png")
            .addFields(
                { name: "Cargo Removido:", value: `${cargo} \n(${cargo.id})`, inline: false },
                { name: "Cargo removido do:", value: `${usuario}`, inline: false },
                { name: "Quem removeu:", value: `${message.author}`, inline: false }
            );

        return message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);


