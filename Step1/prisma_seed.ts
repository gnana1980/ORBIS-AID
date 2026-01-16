import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // =====================================================
  // 1. SEED PLANS
  // =====================================================
  console.log('📦 Seeding Plans...');

  const starterPlan = await prisma.plan.upsert({
    where: { name: 'STARTER' },
    update: {},
    create: {
      name: 'STARTER',
      displayName: 'Starter',
      description: 'Perfect for small NGOs just getting started',
      price: 0,
      currency: 'INR',
      interval: 'MONTHLY',
      trialDays: 14,
      features: {
        basic_features: true,
        email_support: true,
        single_user: true,
      },
      maxProjects: 3,
      maxUsers: 3,
      maxBeneficiaries: 50,
      maxStorage: 512,
      financeEnabled: false,
      complianceEnabled: false,
      apiAccess: false,
      customBranding: false,
      isActive: true,
      sortOrder: 1,
    },
  });

  const growthPlan = await prisma.plan.upsert({
    where: { name: 'GROWTH' },
    update: {},
    create: {
      name: 'GROWTH',
      displayName: 'Growth',
      description: 'Ideal for growing NGOs with multiple projects',
      price: 2999,
      currency: 'INR',
      interval: 'MONTHLY',
      trialDays: 14,
      features: {
        all_starter_features: true,
        advanced_reporting: true,
        priority_support: true,
        team_collaboration: true,
      },
      maxProjects: 10,
      maxUsers: 10,
      maxBeneficiaries: 500,
      maxStorage: 2048,
      financeEnabled: true,
      complianceEnabled: false,
      apiAccess: false,
      customBranding: false,
      isActive: true,
      sortOrder: 2,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: 'PRO' },
    update: {},
    create: {
      name: 'PRO',
      displayName: 'Professional',
      description: 'Complete solution for established NGOs',
      price: 5999,
      currency: 'INR',
      interval: 'MONTHLY',
      trialDays: 14,
      features: {
        all_growth_features: true,
        compliance_management: true,
        api_access: true,
        custom_branding: true,
        dedicated_support: true,
      },
      maxProjects: 50,
      maxUsers: 25,
      maxBeneficiaries: 2000,
      maxStorage: 5120,
      financeEnabled: true,
      complianceEnabled: true,
      apiAccess: true,
      customBranding: false,
      isActive: true,
      sortOrder: 3,
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { name: 'ENTERPRISE' },
    update: {},
    create: {
      name: 'ENTERPRISE',
      displayName: 'Enterprise',
      description: 'Unlimited everything for large organizations',
      price: 14999,
      currency: 'INR',
      interval: 'MONTHLY',
      trialDays: 30,
      features: {
        unlimited_everything: true,
        white_labeling: true,
        custom_integrations: true,
        dedicated_account_manager: true,
        sla_guarantee: true,
      },
      maxProjects: 999999,
      maxUsers: 999999,
      maxBeneficiaries: 999999,
      maxStorage: 51200,
      financeEnabled: true,
      complianceEnabled: true,
      apiAccess: true,
      customBranding: true,
      isActive: true,
      sortOrder: 4,
    },
  });

  console.log('✅ Plans seeded successfully');

  // =====================================================
  // 2. SEED ROLES & PERMISSIONS
  // =====================================================
  console.log('👥 Seeding Roles & Permissions...');

  // Create Permissions
  const permissions = [
    // Project Permissions
    { resource: 'projects', action: 'create', description: 'Create new projects' },
    { resource: 'projects', action: 'read', description: 'View projects' },
    { resource: 'projects', action: 'update', description: 'Update projects' },
    { resource: 'projects', action: 'delete', description: 'Delete projects' },
    
    // Beneficiary Permissions
    { resource: 'beneficiaries', action: 'create', description: 'Create beneficiaries' },
    { resource: 'beneficiaries', action: 'read', description: 'View beneficiaries' },
    { resource: 'beneficiaries', action: 'update', description: 'Update beneficiaries' },
    { resource: 'beneficiaries', action: 'delete', description: 'Delete beneficiaries' },
    { resource: 'beneficiaries', action: 'approve', description: 'Approve beneficiaries' },
    
    // Donor Permissions
    { resource: 'donors', action: 'create', description: 'Create donors' },
    { resource: 'donors', action: 'read', description: 'View donors' },
    { resource: 'donors', action: 'update', description: 'Update donors' },
    { resource: 'donors', action: 'delete', description: 'Delete donors' },
    
    // Finance Permissions
    { resource: 'finance', action: 'create', description: 'Create financial entries' },
    { resource: 'finance', action: 'read', description: 'View financial data' },
    { resource: 'finance', action: 'update', description: 'Update financial entries' },
    { resource: 'finance', action: 'delete', description: 'Delete financial entries' },
    { resource: 'finance', action: 'approve', description: 'Approve financial transactions' },
    
    // User Management Permissions
    { resource: 'users', action: 'create', description: 'Create users' },
    { resource: 'users', action: 'read', description: 'View users' },
    { resource: 'users', action: 'update', description: 'Update users' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    
    // Reports Permissions
    { resource: 'reports', action: 'read', description: 'View reports' },
    { resource: 'reports', action: 'export', description: 'Export reports' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: {},
      create: perm,
    });
  }

  // Create Roles
  const ngoAdminRole = await prisma.role.upsert({
    where: { name: 'NGO_ADMIN' },
    update: {},
    create: {
      name: 'NGO_ADMIN',
      displayName: 'NGO Administrator',
      description: 'Full access to all organization features',
      isSystemRole: true,
    },
  });

  const projectManagerRole = await prisma.role.upsert({
    where: { name: 'PROJECT_MANAGER' },
    update: {},
    create: {
      name: 'PROJECT_MANAGER',
      displayName: 'Project Manager',
      description: 'Manage projects and beneficiaries',
      isSystemRole: true,
    },
  });

  const financeManagerRole = await prisma.role.upsert({
    where: { name: 'FINANCE_MANAGER' },
    update: {},
    create: {
      name: 'FINANCE_MANAGER',
      displayName: 'Finance Manager',
      description: 'Manage financial transactions and reports',
      isSystemRole: true,
    },
  });

  const fieldStaffRole = await prisma.role.upsert({
    where: { name: 'FIELD_STAFF' },
    update: {},
    create: {
      name: 'FIELD_STAFF',
      displayName: 'Field Staff',
      description: 'Limited access for field operations',
      isSystemRole: true,
    },
  });

  const donorRole = await prisma.role.upsert({
    where: { name: 'DONOR' },
    update: {},
    create: {
      name: 'DONOR',
      displayName: 'Donor',
      description: 'Read-only access to donation history',
      isSystemRole: true,
    },
  });

  // Assign Permissions to Roles
  // NGO Admin gets all permissions
  const allPermissions = await prisma.permission.findMany();
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ngoAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: ngoAdminRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Project Manager permissions
  const projectPermissions = await prisma.permission.findMany({
    where: {
      resource: {
        in: ['projects', 'beneficiaries', 'reports'],
      },
    },
  });
  for (const perm of projectPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: projectManagerRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: projectManagerRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Finance Manager permissions
  const financePermissions = await prisma.permission.findMany({
    where: {
      resource: {
        in: ['finance', 'donors', 'reports'],
      },
    },
  });
  for (const perm of financePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: financeManagerRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: financeManagerRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Field Staff - Read only for projects and beneficiaries
  const fieldStaffPerms = await prisma.permission.findMany({
    where: {
      resource: {
        in: ['projects', 'beneficiaries'],
      },
      action: 'read',
    },
  });
  for (const perm of fieldStaffPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: fieldStaffRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: fieldStaffRole.id,
        permissionId: perm.id,
      },
    });
  }

  // Donor - Read only for reports
  const donorPerms = await prisma.permission.findMany({
    where: {
      resource: 'reports',
      action: 'read',
    },
  });
  for (const perm of donorPerms) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: donorRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: donorRole.id,
        permissionId: perm.id,
      },
    });
  }

  console.log('✅ Roles & Permissions seeded successfully');

  // =====================================================
  // 3. SEED SUPER ADMIN
  // =====================================================
  console.log('👨‍💼 Creating Super Admin...');

  const hashedPassword = await bcrypt.hash('SuperAdmin@123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@ngosaas.com' },
    update: {},
    create: {
      email: 'admin@ngosaas.com',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      phone: '+91-9876543210',
      roleId: ngoAdminRole.id, // Temporary role
      isActive: true,
      isSuperAdmin: true,
    },
  });

  console.log('✅ Super Admin created successfully');
  console.log('   Email: admin@ngosaas.com');
  console.log('   Password: SuperAdmin@123');

  // =====================================================
  // 4. SEED DEMO TENANT (Optional)
  // =====================================================
  console.log('🏢 Creating Demo Tenant...');

  const demoTenant = await prisma.tenant.upsert({
    where: { subdomain: 'demo' },
    update: {},
    create: {
      name: 'Demo NGO Foundation',
      subdomain: 'demo',
      email: 'demo@ngosaas.com',
      phone: '+91-9876543210',
      address: '123 Demo Street, Mumbai',
      registrationNo: 'NGO/2024/DEMO',
      panNumber: 'AAATD1234C',
      status: 'ACTIVE',
      isActive: true,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    },
  });

  // Create subscription for demo tenant
  const demoSubscription = await prisma.subscription.create({
    data: {
      tenantId: demoTenant.id,
      planId: growthPlan.id,
      status: 'TRIAL',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // Create demo admin user
  const demoAdminPassword = await bcrypt.hash('Demo@123', 10);
  const demoAdmin = await prisma.user.create({
    data: {
      tenantId: demoTenant.id,
      email: 'admin@demo.ngosaas.com',
      passwordHash: demoAdminPassword,
      firstName: 'Demo',
      lastName: 'Admin',
      phone: '+91-9876543210',
      roleId: ngoAdminRole.id,
      isActive: true,
      isSuperAdmin: false,
    },
  });

  console.log('✅ Demo Tenant created successfully');
  console.log('   Subdomain: demo.ngosaas.com');
  console.log('   Email: admin@demo.ngosaas.com');
  console.log('   Password: Demo@123');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Summary:');
  console.log(`   - Plans: 4`);
  console.log(`   - Roles: 5`);
  console.log(`   - Permissions: ${allPermissions.length}`);
  console.log(`   - Super Admin: 1`);
  console.log(`   - Demo Tenant: 1`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });