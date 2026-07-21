package com.valkyrias.agency.controller;

import com.valkyrias.agency.exception.ProfileStorageException;
import com.valkyrias.agency.model.EditorProfile;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.ClientProfileRepository;
import com.valkyrias.agency.repository.EditorProfileRepository;
import com.valkyrias.agency.repository.UserRepository;
import com.valkyrias.agency.security.SupabaseAuthClient;
import com.valkyrias.agency.security.SupabaseAuthenticationUnavailableException;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.storage.AvatarStorageService;
import com.valkyrias.agency.storage.ValidatedAvatar;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.seed-users.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.datasource.url=jdbc:h2:mem:profile-tests;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.h2.console.enabled=false",
        "supabase.storage.max-avatar-bytes=16"
})
@AutoConfigureMockMvc
@Import(ProfileControllerIntegrationTest.TestDoublesConfiguration.class)
class ProfileControllerIntegrationTest {

    private static final String CLIENT_TOKEN = "client-token";
    private static final String EDITOR_TOKEN = "editor-token";
    private static final String ADMIN_TOKEN = "admin-token";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ClientProfileRepository clientProfileRepository;

    @Autowired
    private EditorProfileRepository editorProfileRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Autowired
    private StubSupabaseAuthClient supabaseAuthClient;

    @Autowired
    private RecordingAvatarStorageService avatarStorageService;

    @BeforeEach
    void cleanDatabaseAndMocks() {
        editorProfileRepository.deleteAll();
        clientProfileRepository.deleteAll();
        userRepository.deleteAll();
        supabaseAuthClient.reset();
        avatarStorageService.reset();
    }

    @Test
    void authenticatedUserCanFetchOwnProfileAndSecretsAreNeverReturned() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        User user = saveUser(principal, UserRole.CLIENT, "legacy-secret");
        user.setDisplayName("Client Display");
        user.setPhoneNumber("+1 555 0100");
        user.setBio("Private bio");
        userRepository.saveAndFlush(user);
        authenticate(CLIENT_TOKEN, principal);

        mockMvc.perform(get("/api/profile/me").header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("client@example.com"))
                .andExpect(jsonPath("$.role").value("CLIENT"))
                .andExpect(jsonPath("$.fullName").value("Test User"))
                .andExpect(jsonPath("$.displayName").value("Client Display"))
                .andExpect(jsonPath("$.phoneNumber").value("+1 555 0100"))
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.supabaseUserId").doesNotExist())
                .andExpect(jsonPath("$.profileImagePath").doesNotExist());
    }

    @Test
    void verifiedSupabaseIdentityCreatesDefaultClientAndPreservesExistingLocalRole() throws Exception {
        SupabaseUserPrincipal newPrincipal = new SupabaseUserPrincipal(
                UUID.randomUUID(), "new-supabase@example.com", "New Supabase User", null);
        authenticate("new-token", newPrincipal);

        mockMvc.perform(get("/api/profile/me").header("Authorization", "Bearer new-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("new-supabase@example.com"))
                .andExpect(jsonPath("$.role").value("CLIENT"));

        User created = userRepository.findBySupabaseUserId(newPrincipal.userId()).orElseThrow();
        assertThat(created.getUserRole()).isEqualTo(UserRole.CLIENT);
        assertThat(created.getPassword()).isNull();

        SupabaseUserPrincipal elevatedClaim = new SupabaseUserPrincipal(
                newPrincipal.userId(), newPrincipal.email(), newPrincipal.fullName(), UserRole.ADMIN);
        authenticate("elevated-token", elevatedClaim);
        mockMvc.perform(get("/api/profile/me").header("Authorization", "Bearer elevated-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CLIENT"));
    }

    @Test
    void verifiedEmailLinkClearsLegacyPasswordAndKeepsLocalRole() throws Exception {
        User legacy = new User();
        legacy.setName("Legacy Editor");
        legacy.setEmail("linked@example.com");
        legacy.setPassword("legacy-password");
        legacy.setRole("EDITOR");
        userRepository.saveAndFlush(legacy);

        SupabaseUserPrincipal principal = new SupabaseUserPrincipal(
                UUID.randomUUID(), "linked@example.com", "Verified Name", UserRole.ADMIN);
        authenticate("linked-token", principal);
        mockMvc.perform(get("/api/profile/me").header("Authorization", "Bearer linked-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("EDITOR"));

        User linked = userRepository.findBySupabaseUserId(principal.userId()).orElseThrow();
        assertThat(linked.getId()).isEqualTo(legacy.getId());
        assertThat(linked.getPassword()).isNull();
        assertThat(linked.getUserRole()).isEqualTo(UserRole.EDITOR);
    }

    @Test
    void unauthenticatedAndInvalidTokensReceiveConsistent401() throws Exception {
        mockMvc.perform(get("/api/profile/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.path").value("/api/profile/me"));

        supabaseAuthClient.fail("bad-token", new BadCredentialsException("Bearer token is invalid or expired"));
        mockMvc.perform(get("/api/profile/me").header("Authorization", "Bearer bad-token"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void authenticationProviderOutageReceives503() throws Exception {
        supabaseAuthClient.fail(
                "outage-token",
                new SupabaseAuthenticationUnavailableException("Supabase authentication is temporarily unavailable")
        );

        mockMvc.perform(get("/api/profile/me").header("Authorization", "Bearer outage-token"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.error").value("Authentication service unavailable"));
    }

    @Test
    void clientCanUpdateAndReloadOwnSharedAndClientProfile() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        User user = saveUser(principal, UserRole.CLIENT, null);
        authenticate(CLIENT_TOKEN, principal);

        String request = """
                {
                  "fullName":"  Updated Client  ",
                  "displayName":"  Studio One  ",
                  "phoneNumber":"+91 98765 43210",
                  "country":"India",
                  "timezone":"Asia/Kolkata",
                  "bio":"A client profile",
                  "clientProfile":{
                    "companyName":"  Valkyrias Client Co  ",
                    "clientType":"BUSINESS",
                    "preferredCommunication":"EMAIL",
                    "defaultProjectCategory":"Commercial"
                  }
                }
                """;

        mockMvc.perform(put("/api/profile/me")
                        .header("Authorization", "Bearer " + CLIENT_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Updated Client"))
                .andExpect(jsonPath("$.displayName").value("Studio One"))
                .andExpect(jsonPath("$.clientProfile.companyName").value("Valkyrias Client Co"))
                .andExpect(jsonPath("$.clientProfile.clientType").value("BUSINESS"))
                .andExpect(jsonPath("$.editorProfile").value(org.hamcrest.Matchers.nullValue()));

        mockMvc.perform(get("/api/profile/me").header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Updated Client"))
                .andExpect(jsonPath("$.clientProfile.defaultProjectCategory").value("Commercial"));

        User persisted = userRepository.findById(user.getId()).orElseThrow();
        assertThat(persisted.getFullName()).isEqualTo("Updated Client");
        assertThat(persisted.getRole()).isEqualTo("CLIENT");
    }

    @Test
    void invalidProfileDataReturnsFieldErrorsWithoutChangingValues() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        User user = saveUser(principal, UserRole.CLIENT, null);
        authenticate(CLIENT_TOKEN, principal);

        mockMvc.perform(put("/api/profile/me")
                        .header("Authorization", "Bearer " + CLIENT_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":" ","phoneNumber":"abc","timezone":"Not/A_Real_Zone"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"))
                .andExpect(jsonPath("$.fieldErrors.fullName").exists())
                .andExpect(jsonPath("$.fieldErrors.phoneNumber").exists())
                .andExpect(jsonPath("$.fieldErrors.timezone").exists());

        assertThat(userRepository.findById(user.getId()).orElseThrow().getFullName()).isEqualTo("Test User");
    }

    @Test
    void clientCannotSubmitEditorOnlyData() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        saveUser(principal, UserRole.CLIENT, null);
        authenticate(CLIENT_TOKEN, principal);

        mockMvc.perform(put("/api/profile/me")
                        .header("Authorization", "Bearer " + CLIENT_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Client User","editorProfile":{"professionalTitle":"Editor"}}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("CLIENT accounts cannot submit editor profile fields"));

        assertThat(editorProfileRepository.count()).isZero();
    }

    @Test
    void editorSpecificDataPersistsWithCaseInsensitiveTagDeduplication() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.EDITOR, "editor@example.com");
        User user = saveUser(principal, UserRole.EDITOR, null);
        authenticate(EDITOR_TOKEN, principal);

        mockMvc.perform(put("/api/profile/me")
                        .header("Authorization", "Bearer " + EDITOR_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Editor User",
                                  "editorProfile":{
                                    "professionalTitle":"Senior Editor",
                                    "experienceYears":8,
                                    "skills":["Color Grading"," color grading ","VFX"],
                                    "softwareUsed":["DaVinci Resolve"],
                                    "languages":["English","english","Hindi"],
                                    "startingPrice":2500.00,
                                    "hourlyRate":900.50,
                                    "deliveryTime":"3 days",
                                    "availabilityStatus":"AVAILABLE",
                                    "portfolioSummary":"Selected work",
                                    "certifications":["Adobe Certified"],
                                    "location":"Mumbai",
                                    "websiteUrl":"https://example.com",
                                    "instagramUrl":"https://instagram.com/example",
                                    "linkedinUrl":"https://linkedin.com/in/example"
                                  }
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("EDITOR"))
                .andExpect(jsonPath("$.editorProfile.experienceYears").value(8))
                .andExpect(jsonPath("$.editorProfile.skills.length()").value(2))
                .andExpect(jsonPath("$.clientProfile").value(org.hamcrest.Matchers.nullValue()));

        transactionTemplate.executeWithoutResult(status -> {
            EditorProfile persisted = editorProfileRepository.findById(user.getId()).orElseThrow();
            assertThat(persisted.getSkills()).containsExactlyInAnyOrder("Color Grading", "VFX");
            assertThat(persisted.getLanguages()).containsExactlyInAnyOrder("English", "Hindi");
            assertThat(persisted.getHourlyRate()).isEqualByComparingTo(new BigDecimal("900.50"));
        });
    }

    @Test
    void roleAndIdentityFieldsCannotBeMassAssigned() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        User user = saveUser(principal, UserRole.CLIENT, null);
        authenticate(CLIENT_TOKEN, principal);

        mockMvc.perform(put("/api/profile/me")
                        .header("Authorization", "Bearer " + CLIENT_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                .content("""
                                {"fullName":"Client User","role":"ADMIN","email":"attacker@example.com"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CLIENT"))
                .andExpect(jsonPath("$.email").value("client@example.com"));

        User persisted = userRepository.findById(user.getId()).orElseThrow();
        assertThat(persisted.getRole()).isEqualTo("CLIENT");
        assertThat(persisted.getEmail()).isEqualTo("client@example.com");
    }

    @Test
    void anotherUserIdRouteDoesNotExist() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        saveUser(principal, UserRole.CLIENT, null);
        authenticate(CLIENT_TOKEN, principal);

        mockMvc.perform(put("/api/profile/" + UUID.randomUUID())
                        .header("Authorization", "Bearer " + CLIENT_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Victim Changed\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void wrongMethodAndMediaTypePreserve405And415() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        saveUser(principal, UserRole.CLIENT, null);
        authenticate(CLIENT_TOKEN, principal);

        mockMvc.perform(post("/api/profile/me")
                        .header("Authorization", "Bearer " + CLIENT_TOKEN)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));

        mockMvc.perform(put("/api/profile/me")
                        .header("Authorization", "Bearer " + CLIENT_TOKEN)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("not-json"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415));
    }

    @Test
    void validAvatarUploadReplacesOldObjectAndReturnsSignedUrl() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        User user = saveUser(principal, UserRole.CLIENT, null);
        user.setProfileImagePath("old-owner/avatars/old.png");
        userRepository.saveAndFlush(user);
        authenticate(CLIENT_TOKEN, principal);
        avatarStorageService.uploadPath = principal.userId() + "/avatars/new.png";

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "../unsafe-name.png",
                "image/png",
                pngBytes()
        );
        mockMvc.perform(multipart("/api/profile/me/avatar")
                        .file(file)
                        .header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profileImageUrl")
                        .value("https://signed.example/" + principal.userId() + "/avatars/new.png"));

        assertThat(avatarStorageService.uploads).hasSize(1);
        assertThat(avatarStorageService.uploads.getFirst().ownerId()).isEqualTo(principal.userId());
        assertThat(avatarStorageService.uploads.getFirst().avatar().contentType()).isEqualTo("image/png");
        assertThat(avatarStorageService.uploads.getFirst().avatar().extension()).isEqualTo("png");
        assertThat(avatarStorageService.deletedPaths).contains("old-owner/avatars/old.png");
        assertThat(userRepository.findById(user.getId()).orElseThrow().getProfileImagePath())
                .isEqualTo(principal.userId() + "/avatars/new.png");
    }

    @Test
    void avatarValidationRejectsOversizeAndSpoofedFiles() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        saveUser(principal, UserRole.CLIENT, null);
        authenticate(CLIENT_TOKEN, principal);

        MockMultipartFile oversized = new MockMultipartFile("file", "large.png", "image/png", new byte[17]);
        mockMvc.perform(multipart("/api/profile/me/avatar")
                        .file(oversized)
                        .header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("maximum size")));

        MockMultipartFile spoofed = new MockMultipartFile("file", "fake.jpg", "image/jpeg", pngBytes());
        mockMvc.perform(multipart("/api/profile/me/avatar")
                        .file(spoofed)
                        .header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("does not match")));

        assertThat(avatarStorageService.uploads).isEmpty();
    }

    @Test
    void avatarCanBeRemovedAndDeleteIsIdempotent() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        User user = saveUser(principal, UserRole.CLIENT, null);
        user.setProfileImagePath(principal.userId() + "/avatars/current.png");
        userRepository.saveAndFlush(user);
        authenticate(CLIENT_TOKEN, principal);

        mockMvc.perform(delete("/api/profile/me/avatar")
                        .header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        assertThat(avatarStorageService.deletedPaths).contains(principal.userId() + "/avatars/current.png");
        assertThat(userRepository.findById(user.getId()).orElseThrow().getProfileImagePath()).isNull();

        mockMvc.perform(delete("/api/profile/me/avatar")
                        .header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isNoContent());
    }

    @Test
    void storageFailureUsesConsistent502WithoutChangingAvatar() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        User user = saveUser(principal, UserRole.CLIENT, null);
        authenticate(CLIENT_TOKEN, principal);
        avatarStorageService.uploadFailure = new ProfileStorageException("Avatar upload failed");

        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", pngBytes());
        mockMvc.perform(multipart("/api/profile/me/avatar")
                        .file(file)
                        .header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value(502));
        assertThat(userRepository.findById(user.getId()).orElseThrow().getProfileImagePath()).isNull();
    }

    @Test
    void failedSignedUrlRollsBackDatabaseAndCleansOnlyNewAvatar() throws Exception {
        SupabaseUserPrincipal principal = principal(UserRole.CLIENT, "client@example.com");
        User user = saveUser(principal, UserRole.CLIENT, null);
        String oldPath = principal.userId() + "/avatars/old.png";
        String newPath = principal.userId() + "/avatars/new.png";
        user.setProfileImagePath(oldPath);
        userRepository.saveAndFlush(user);
        authenticate(CLIENT_TOKEN, principal);
        avatarStorageService.uploadPath = newPath;
        avatarStorageService.signedUrlFailures.put(
                newPath,
                new ProfileStorageException("Avatar URL generation failed")
        );

        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", pngBytes());
        mockMvc.perform(multipart("/api/profile/me/avatar")
                        .file(file)
                        .header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isBadGateway());

        assertThat(userRepository.findById(user.getId()).orElseThrow().getProfileImagePath()).isEqualTo(oldPath);
        assertThat(avatarStorageService.deletedPaths).contains(newPath).doesNotContain(oldPath);
    }

    @Test
    void adminUserListingIsProtectedAndUsesSafeSummary() throws Exception {
        SupabaseUserPrincipal admin = principal(UserRole.ADMIN, "admin@example.com");
        User adminUser = saveUser(admin, UserRole.ADMIN, "admin-secret");
        adminUser.setDisplayName("Administrator");
        adminUser.setPhoneNumber("+1 555 9999");
        adminUser.setBio("Must not be listed");
        userRepository.saveAndFlush(adminUser);
        authenticate(ADMIN_TOKEN, admin);

        mockMvc.perform(get("/api/auth/users").header("Authorization", "Bearer " + ADMIN_TOKEN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("admin@example.com"))
                .andExpect(jsonPath("$[0].role").value("ADMIN"))
                .andExpect(jsonPath("$[0].displayName").value("Administrator"))
                .andExpect(jsonPath("$[0].id").doesNotExist())
                .andExpect(jsonPath("$[0].password").doesNotExist())
                .andExpect(jsonPath("$[0].phoneNumber").doesNotExist())
                .andExpect(jsonPath("$[0].bio").doesNotExist())
                .andExpect(jsonPath("$[0].supabaseUserId").doesNotExist());

        SupabaseUserPrincipal client = principal(UserRole.CLIENT, "client@example.com");
        saveUser(client, UserRole.CLIENT, null);
        authenticate(CLIENT_TOKEN, client);
        mockMvc.perform(get("/api/auth/users").header("Authorization", "Bearer " + CLIENT_TOKEN))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        mockMvc.perform(get("/api/auth/users"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void legacyLoginAndRegistrationResponsesNeverSerializePrivateOrSecurityFields() throws Exception {
        User legacy = new User();
        legacy.setName("Legacy User");
        legacy.setEmail("legacy@example.com");
        legacy.setPassword("legacy-password");
        legacy.setRole("client");
        legacy.setPhoneNumber("+1 555 0000");
        legacy.setBio("private");
        userRepository.saveAndFlush(legacy);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"legacy@example.com\",\"password\":\"legacy-password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("legacy@example.com"))
                .andExpect(jsonPath("$.user.role").value("CLIENT"))
                .andExpect(jsonPath("$.user.id").doesNotExist())
                .andExpect(jsonPath("$.user.password").doesNotExist())
                .andExpect(jsonPath("$.user.phoneNumber").doesNotExist())
                .andExpect(jsonPath("$.user.bio").doesNotExist());

        UUID attackerSuppliedId = UUID.randomUUID();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"id":"%s","name":"New User","email":"new@example.com",
                                 "password":"new-password","role":"ADMIN","phoneNumber":"+1 555 1111"}
                                """.formatted(attackerSuppliedId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("new@example.com"))
                .andExpect(jsonPath("$.user.role").value("CLIENT"))
                .andExpect(jsonPath("$.user.id").doesNotExist())
                .andExpect(jsonPath("$.user.password").doesNotExist())
                .andExpect(jsonPath("$.user.phoneNumber").doesNotExist());

        User registered = userRepository.findByEmailIgnoreCase("new@example.com").orElseThrow();
        assertThat(registered.getId()).isNotEqualTo(attackerSuppliedId);
        assertThat(registered.getRole()).isEqualToIgnoringCase("client");
        assertThat(registered.getPhoneNumber()).isNull();
    }

    private void authenticate(String token, SupabaseUserPrincipal principal) {
        supabaseAuthClient.authenticate(token, principal);
    }

    private User saveUser(SupabaseUserPrincipal principal, UserRole role, String password) {
        User user = new User();
        user.setName("Test User");
        user.setEmail(principal.email());
        user.setPassword(password);
        user.setRole(role.name());
        user.setSupabaseUserId(principal.userId());
        return userRepository.saveAndFlush(user);
    }

    private static SupabaseUserPrincipal principal(UserRole role, String email) {
        return new SupabaseUserPrincipal(UUID.randomUUID(), email, "Test User", role);
    }

    private static byte[] pngBytes() {
        return new byte[]{(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestDoublesConfiguration {

        @Bean
        @Primary
        StubSupabaseAuthClient stubSupabaseAuthClient() {
            return new StubSupabaseAuthClient();
        }

        @Bean
        @Primary
        RecordingAvatarStorageService recordingAvatarStorageService() {
            return new RecordingAvatarStorageService();
        }
    }

    static final class StubSupabaseAuthClient extends SupabaseAuthClient {
        private final Map<String, Object> outcomes = new HashMap<>();

        StubSupabaseAuthClient() {
            super(RestClient.builder(), "", "");
        }

        void authenticate(String token, SupabaseUserPrincipal principal) {
            outcomes.put(token, principal);
        }

        void fail(String token, RuntimeException exception) {
            outcomes.put(token, exception);
        }

        void reset() {
            outcomes.clear();
        }

        @Override
        public SupabaseUserPrincipal verify(String accessToken) {
            Object outcome = outcomes.get(accessToken);
            if (outcome instanceof SupabaseUserPrincipal principal) {
                return principal;
            }
            if (outcome instanceof RuntimeException exception) {
                throw exception;
            }
            throw new BadCredentialsException("Bearer token is invalid or expired");
        }
    }

    static final class RecordingAvatarStorageService implements AvatarStorageService {
        private final List<UploadCall> uploads = new ArrayList<>();
        private final List<String> deletedPaths = new ArrayList<>();
        private final Map<String, RuntimeException> signedUrlFailures = new HashMap<>();
        private String uploadPath;
        private RuntimeException uploadFailure;

        void reset() {
            uploads.clear();
            deletedPaths.clear();
            signedUrlFailures.clear();
            uploadPath = null;
            uploadFailure = null;
        }

        @Override
        public String upload(UUID ownerId, ValidatedAvatar avatar) {
            if (uploadFailure != null) {
                throw uploadFailure;
            }
            uploads.add(new UploadCall(ownerId, avatar));
            return uploadPath == null ? ownerId + "/avatars/default.png" : uploadPath;
        }

        @Override
        public void delete(String objectPath) {
            deletedPaths.add(objectPath);
        }

        @Override
        public String createSignedUrl(String objectPath) {
            RuntimeException failure = signedUrlFailures.get(objectPath);
            if (failure != null) {
                throw failure;
            }
            return "https://signed.example/" + objectPath;
        }

        private record UploadCall(UUID ownerId, ValidatedAvatar avatar) {
        }
    }
}
