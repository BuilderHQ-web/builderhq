package au.com.builderhq.app.core.model

import au.com.builderhq.app.core.network.dto.UserDto

data class User(
    val id: String,
    val email: String,
    val name: String?,
    val role: Role,
    val needsOnboarding: Boolean,
)

enum class Role { OWNER, BUILDER, ADMIN, UNKNOWN }

fun UserDto.toUser(): User = User(
    id = id,
    email = email,
    name = name,
    role = when (role) {
        "project_owner" -> Role.OWNER
        "builder" -> Role.BUILDER
        "admin" -> Role.ADMIN
        else -> Role.UNKNOWN
    },
    needsOnboarding = needsOnboarding,
)
