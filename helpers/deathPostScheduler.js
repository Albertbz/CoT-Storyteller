const { ContainerBuilder, MessageFlags, userMention, inlineCode } = require('discord.js');
const { DeathPosts, Deceased, Characters, DiscordChannels } = require('../dbObjects');
const { postInLogChannel, COLORS } = require('../misc');

const timeouts = new Map();

async function sendPost(postId) {
    try {
        const post = await DeathPosts.findByPk(postId, {
            include: [{
                model: Deceased,
                as: 'deceased',
                include: {
                    model: Characters,
                    as: 'character'
                }
            }]
        });

        if (!post) {
            console.error(`Death post ${postId} not found`);
            return;
        }

        const graveyardChannelEntry = await DiscordChannels.findByPk('graveyard');
        if (!graveyardChannelEntry) {
            console.log('No graveyard channel registered. Cannot post death post. Please register a graveyard channel using /register channel.');
            return;
        }

        const graveyardChannel = client.channels.cache.get(graveyardChannelEntry.channelId);

        if (!graveyardChannel) {
            console.error('Graveyard channel not found. Cannot post death post.');
            return;
        }

        const container = new ContainerBuilder()
            .addTextDisplayComponents((textDisplay) =>
                textDisplay.setContent(
                    `### ${post.deceased.character.name}\n` +
                    `Passed away on ${post.deceased.dayOfDeath} ${post.deceased.monthOfDeath}, Year ${post.deceased.yearOfDeath}.\n` +
                    // `${post.deceased.causeOfDeath}/n` + // I don't think we should show this, but we can easily add it back in if we want
                    `>>> ${post.note}\n\n`
                )
            );

        await graveyardChannel.send({
            components: [container], flags: [MessageFlags.IsComponentsV2]
        });

        await postInLogChannel(
            'Death Post Posted',
            `Death Post for ${inlineCode(post.deceased.character.name)} (${inlineCode(post.deceased.character.id)}) posted to ${graveyardChannel}.`,
            COLORS.GREEN
        )

        await post.destroy();

        timeouts.delete(postId.toString());

    } catch (error) {
        console.error('Error sending death post:', error);
    }
}


async function schedulePost(deathPost) {
    const scheduledPostTime = new Date(deathPost.scheduledPostTime).getTime();
    const delay = scheduledPostTime - Date.now();

    if (delay <= 0) {
        await sendPost(deathPost.id);
        return;
    }

    const timeoutId = setTimeout(async () => {
        await sendPost(deathPost.id);
    }, delay);

    timeouts.set(deathPost.id.toString(), timeoutId);
}

async function initializeDeathPosts() {
    try {
        const allPosts = await DeathPosts.findAll({
            include: {
                model: Deceased,
                as: 'deceased'
            }
        });

        for (const post of allPosts) {
            await schedulePost(post);
        }

    } catch (error) {
        console.error('Error initializing death posts:', error);
    }
}

// Cancel a specific scheduled post by deceased character, not attached to anything yet. If needed, we can build this out
// async function cancelPost(characterID) {
//     // Find the death post by characterId
//     const post = await DeathPosts.findOne({
//         where: {
//             characterId: characterID
//         }
//     });

//     if (!post) {
//         console.log(`No death post found for character ${characterID}`);
//         return false;
//     }
//     const timeoutId = timeouts.get(deathPost.id.toString());
//     if (timeoutId) {
//         clearTimeout(timeoutId);
//         timeouts.delete(deathPost.id.toString());
//         await post.destroy();
//         console.log(`Cancelled and deleted death post for ${characterID}`);
//     }
// }

module.exports = {
    sendPost,
    schedulePost,
    initializeDeathPosts,
    // cancelPost
};