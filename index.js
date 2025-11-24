// ===================== KEEP ALIVE =====================
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
            "Registro A7.\n\nSolicite Set usando os botões abaixo.\nRegistre-se abaixo."
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

    await interaction.reply({ content: "Seu pedido foi enviado!", ephemeral: true });
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
                    { name: "Usuário:", value: membro.user.tag },
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
require("dotenv").config();
const { Client, GatewayIntentBits, Partials, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ],
    partials: [Partials.User, Partials.Channel, Partials.GuildMember]
});

// Coleção para armazenar comandos
client.commands = new Collection();

// Carregar comandos da pasta /commands
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
    console.log(`Comando carregado: ${command.data.name}`);
}

// Quando o bot fica online
client.once("ready", () => {
    console.log(`🔥 Bot online como ${client.user.tag}`);
});

// Listener de interações (slash commands)
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.log("Comando não encontrado.");
        return;
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error("Erro ao executar comando:", error);
        return interaction.reply({
            content: "❌ Ocorreu um erro ao executar este comando.",
            ephemeral: true
        });
    }
});

// Login do bot
client.login(process.env.TOKEN);
