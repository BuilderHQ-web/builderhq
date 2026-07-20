/**
 * Architect mount of the messages inbox. Same page as the owner one —
 * conversations are keyed to the signed-in user, so the architect sees
 * exactly their own threads; mounting it here keeps them on /architect
 * paths. First-class messaging chrome lands with the P5 redesign.
 */
export { default, metadata } from "../../owner/messages/page";
