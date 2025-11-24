// index.js - Bot de registro A7 (complete)

// ===== KEEP ALIVE PARA FICAR 24H =====
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot ativo!"));
app.listen(3000, () => console.log("Keep alive rodando!"));
// ====================================

// ===== DOTENV =====
require("dotenv").config();

// ===== DISCORD =====
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
  ],
});

// ===== ENV VARS =====
const CANAL_PEDIR_SET = process.env.CANAL_PEDIR_SET;
const CANAL_ACEITA_SET = process.env.CANAL_ACEITA_SET;
const CARGO_APROVADO = process.env.CARGO_APROVADO;
const CARGO_APROVADO_2 = process.env.CARGO_APROVADO_2;
const TOKEN = process.env.TOKEN;

// helper: pega campo da embed (compatível com embed.data.fields ou embed.fields)
function getEmbedField(embed, fieldName) {
  if (!embed) return undefined;
  let fields = embed.fields;
  if (!fields || fields.length === 0) {
    fields = embed.data?.fields || [];
  }
  return (fields || []).find(f => f.name === fieldName)?.value;
}

// ===== QUANDO O BOT LIGA =====
client.on("ready", async () => {
  console.log(`Bot ligado como ${client.user.tag}`);

  // tenta enviar a mensagem inicial (se canal configurado)
  try {
    if (!CANAL_PEDIR_SET) {
      console.warn("CANAL_PEDIR_SET não definido nas env vars.");
      return;
    }
    const canal = await client.channels.fetch(CANAL_PEDIR_SET);

    const embed = new EmbedBuilder()
      .setTitle("Sistema Familia A7")
      .setDescription(
        "Registro A7.\n\n Solicite Set , usando os botões abaixo.\n Registre-se Abaixo."
      )
      .addFields({
        name: "📌 Observações",
        value: "• A resenha aqui e garantida.\n• Nao leve a brincadeira a serio.",
      })
      .setColor("#f1c40f");

    const btnRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("abrirRegistro")
        .setLabel("Registro")
        .setStyle(ButtonStyle.Primary)
    );

    // envia a mensagem (se já existir uma, você pode remover essa lógica para evitar duplo envio)
    await canal.send({ embeds: [embed], components: [btnRow] });
  } catch (err) {
    console.error("Erro ao enviar embed inicial:", err);
  }
});

// ===== ABRIR MODAL =====
client.on(Events.InteractionCreate, async (interaction) => {
  try {
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
  } catch (err) {
    console.error("Erro ao abrir modal:", err);
  }
});

// ===== RECEBER FORMULÁRIO =====
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== "modalRegistro") return;

    const nome = interaction.fields.getTextInputValue("nome");
    const iduser = interaction.fields.getTextInputValue("iduser");

    if (!CANAL_ACEITA_SET) {
      await interaction.reply({ content: "Canal de aprovação não configurado.", ephemeral: true });
      return;
    }

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
  } catch (err) {
    console.error("Erro ao receber modal:", err);
    if (!interaction.replied) {
      await interaction.reply({ content: "Erro interno.", ephemeral: true });
    }
  }
});

// ===== APROVAR / NEGAR =====
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    const [acao, userId] = interaction.customId.split("_");
    if (!["aprovar", "negar"].includes(acao)) return;

    // tenta buscar o membro
    let membro;
    try {
      membro = await interaction.guild.members.fetch(userId);
    } catch (e) {
      console.error("Não foi possível buscar o membro:", e);
      await interaction.reply({ content: "Não encontrei o usuário no servidor.", ephemeral: true });
      return;
    }

    // pega embed original (pedido)
    const embedOriginal = interaction.message.embeds[0];
    const nomeInformado = getEmbedField(embedOriginal, "Nome Informado") || "N/A";
    const idInformado = getEmbedField(embedOriginal, "ID Informado") || getEmbedField(embedOriginal, "ID") || "N/A";

    // prepara embed e remove botões (via interaction.update)
    if (acao === "aprovar") {
      try {
        // tentar alterar nickname
        await membro.setNickname(`A7 ${nomeInformado}`).catch(err => {
          // falha em setNickname não deve quebrar todo o fluxo
          console.warn("Falha ao setNickname:", err?.message || err);
        });

        // aplicar dois cargos (se definidos)
        const rolesToAdd = [];
        if (CARGO_APROVADO) rolesToAdd.push(CARGO_APROVADO);
        if (CARGO_APROVADO_2) rolesToAdd.push(CARGO_APROVADO_2);
        if (rolesToAdd.length > 0) {
          await membro.roles.add(rolesToAdd).catch(err => {
            console.warn("Falha ao adicionar cargos:", err?.message || err);
          });
        }

        // criar embed de aprovado (estilo similar ao que mostrou)
        const embedAprovado = new EmbedBuilder()
          .setColor("Green")
          .setTitle("Registro Aprovado")
          .setThumbnail(embedOriginal?.thumbnail?.url || membro.user.displayAvatarURL())
          .addFields(
            { name: "👤 Usuário", value: `${membro}`, inline: true },
            { name: "🆔 ID", value: `${idInformado}`, inline: true },
            { name: "📛 Nome Informado", value: `A7 ${nomeInformado}`, inline: false },
            { name: "✅ Aprovado por", value: `${interaction.user}`, inline: false }
          )
          .setFooter({ text: "Aprovado com sucesso!" });

        // atualiza a mensagem original (remove botões e coloca embed aprovado)
        await interaction.update({ embeds: [embedAprovado], components: [] });

        // opcional: enviar um reply privado de confirmação (ephemeral)
        // await interaction.followUp({ content: `Registro aprovado: A7 ${nomeInformado}`, ephemeral: true });

      } catch (err) {
        console.error("Erro no fluxo de aprovação:", err);
        if (!interaction.replied) {
          await interaction.reply({ content: "Erro ao aprovar. Verifique permissões.", ephemeral: true });
        }
      }
    } else if (acao === "negar") {
      try {
        // tenta expulsar o membro
        await membro.kick("Registro negado pelo aprovador.").catch(err => {
          console.warn("Falha ao expulsar:", err?.message || err);
        });

        // embed negado
        const embedNegado = new EmbedBuilder()
          .setColor("Red")
          .setTitle("Registro Negado")
          .setThumbnail(embedOriginal?.thumbnail?.url || membro.user.displayAvatarURL())
          .addFields(
            { name: "👤 Usuário", value: `${membro}`, inline: true },
            { name: "🆔 ID", value: `${idInformado}`, inline: true },
            { name: "❌ Negado por", value: `${interaction.user}`, inline: false }
          )
          .setFooter({ text: "Registro negado." });

        await interaction.update({ embeds: [embedNegado], components: [] });

      } catch (err) {
        console.error("Erro no fluxo de negação:", err);
        if (!interaction.replied) {
          await interaction.reply({ content: "Erro ao negar. Verifique permissões.", ephemeral: true });
        }
      }
    }
  } catch (err) {
    console.error("Erro no handler de interação (aprovar/negar):", err);
  }
});

// ===== LOGIN =====
client.login(TOKEN);
