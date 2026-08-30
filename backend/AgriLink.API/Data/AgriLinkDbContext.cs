using AgriLink.API.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AgriLink.API.Data;

public class AgriLinkDbContext : IdentityDbContext<ApplicationUser, IdentityRole<int>, int>
{
    public AgriLinkDbContext(DbContextOptions<AgriLinkDbContext> options) : base(options)
    {
    }

    public DbSet<FarmerProfile> FarmerProfiles => Set<FarmerProfile>();
    public DbSet<BuyerProfile> BuyerProfiles => Set<BuyerProfile>();
    public DbSet<OfficerProfile> OfficerProfiles => Set<OfficerProfile>();
    public DbSet<Farm> Farms => Set<Farm>();
    public DbSet<Field> Fields => Set<Field>();
    public DbSet<Crop> Crops => Set<Crop>();
    public DbSet<CropActivity> CropActivities => Set<CropActivity>();
    public DbSet<CropIssue> CropIssues => Set<CropIssue>();
    public DbSet<AIAdvisory> AIAdvisories => Set<AIAdvisory>();
    public DbSet<AgentWorkflow> AgentWorkflows => Set<AgentWorkflow>();
    public DbSet<AgentExecution> AgentExecutions => Set<AgentExecution>();
    public DbSet<HarvestListing> HarvestListings => Set<HarvestListing>();
    public DbSet<PurchaseRequest> PurchaseRequests => Set<PurchaseRequest>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<FarmerProfile>(entity =>
        {
            entity.HasIndex(f => f.UserId).IsUnique();
            entity.HasOne(f => f.User)
                .WithOne(u => u.FarmerProfile)
                .HasForeignKey<FarmerProfile>(f => f.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(f => f.NIC).HasMaxLength(20).IsRequired();
            entity.Property(f => f.District).HasMaxLength(50).IsRequired();
        });

        builder.Entity<BuyerProfile>(entity =>
        {
            entity.HasIndex(b => b.UserId).IsUnique();
            entity.HasOne(b => b.User)
                .WithOne(u => u.BuyerProfile)
                .HasForeignKey<BuyerProfile>(b => b.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(b => b.BusinessName).HasMaxLength(100).IsRequired();
            entity.Property(b => b.District).HasMaxLength(50).IsRequired();
        });

        builder.Entity<OfficerProfile>(entity =>
        {
            entity.HasIndex(o => o.UserId).IsUnique();
            entity.HasOne(o => o.User)
                .WithOne(u => u.OfficerProfile)
                .HasForeignKey<OfficerProfile>(o => o.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.Property(o => o.Department).HasMaxLength(100).IsRequired();
            entity.Property(o => o.District).HasMaxLength(50).IsRequired();
        });

        builder.Entity<Farm>(entity =>
        {
            entity.HasIndex(f => f.District);
            entity.Property(f => f.Name).HasMaxLength(100).IsRequired();
            entity.Property(f => f.District).HasMaxLength(50).IsRequired();
            entity.Property(f => f.Area).HasColumnType("decimal(8,2)");
            entity.HasOne(f => f.FarmerProfile)
                .WithMany(fp => fp.Farms)
                .HasForeignKey(f => f.FarmerProfileId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Field>(entity =>
        {
            entity.Property(f => f.Name).HasMaxLength(100).IsRequired();
            entity.Property(f => f.Area).HasColumnType("decimal(8,2)");
            entity.HasOne(f => f.Farm)
                .WithMany(farm => farm.Fields)
                .HasForeignKey(f => f.FarmId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<Crop>(entity =>
        {
            entity.Property(c => c.CropType).HasMaxLength(100).IsRequired();
            entity.Property(c => c.Variety).HasMaxLength(100);
            entity.Property(c => c.ExpectedQuantity).HasColumnType("decimal(10,2)");
            entity.Property(c => c.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(c => c.Status);
            entity.HasOne(c => c.Field)
                .WithMany(field => field.Crops)
                .HasForeignKey(c => c.FieldId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CropActivity>(entity =>
        {
            entity.HasKey(a => a.ActivityId);
            entity.Property(a => a.ActivityType).HasMaxLength(50).IsRequired();
            entity.HasOne(a => a.Crop)
                .WithMany(c => c.Activities)
                .HasForeignKey(a => a.CropId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<CropIssue>(entity =>
        {
            entity.HasKey(i => i.IssueId);
            entity.Property(i => i.Title).HasMaxLength(150).IsRequired();
            entity.Property(i => i.Description).IsRequired();
            entity.Property(i => i.Severity).HasConversion<string>().HasMaxLength(20);
            entity.Property(i => i.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(i => i.Status);
            entity.HasOne(i => i.Crop)
                .WithMany()
                .HasForeignKey(i => i.CropId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(i => i.FarmerProfile)
                .WithMany()
                .HasForeignKey(i => i.FarmerProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AIAdvisory>(entity =>
        {
            entity.HasKey(a => a.AdvisoryId);
            entity.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(a => a.RiskLevel).HasConversion<string>().HasMaxLength(20);
            entity.Property(a => a.Recommendation).IsRequired();
            entity.HasIndex(a => a.Status);
            entity.HasOne(a => a.Issue)
                .WithMany(i => i.Advisories)
                .HasForeignKey(a => a.IssueId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(a => a.ReviewedByUser)
                .WithMany()
                .HasForeignKey(a => a.ReviewedByFK)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<AgentWorkflow>(entity =>
        {
            entity.HasKey(w => w.WorkflowId);
            entity.Property(w => w.Objective).HasMaxLength(200).IsRequired();
            entity.Property(w => w.CurrentStep).HasMaxLength(100);
            entity.Property(w => w.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasOne(w => w.Advisory)
                .WithMany(a => a.Workflows)
                .HasForeignKey(w => w.AdvisoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AgentExecution>(entity =>
        {
            entity.HasKey(e => e.ExecutionId);
            entity.Property(e => e.AgentName).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasOne(e => e.Workflow)
                .WithMany(w => w.Executions)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<HarvestListing>(entity =>
        {
            entity.HasKey(h => h.HarvestId);
            entity.Property(h => h.Quantity).HasColumnType("decimal(10,2)");
            entity.Property(h => h.AvailableQuantity).HasColumnType("decimal(10,2)");
            entity.Property(h => h.PricePerUnit).HasColumnType("decimal(10,2)");
            entity.Property(h => h.Location).HasMaxLength(150).IsRequired();
            entity.Property(h => h.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(h => h.Status);
            entity.HasOne(h => h.FarmerProfile)
                .WithMany()
                .HasForeignKey(h => h.FarmerProfileId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(h => h.Crop)
                .WithMany()
                .HasForeignKey(h => h.CropId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<PurchaseRequest>(entity =>
        {
            entity.HasKey(r => r.RequestId);
            entity.Property(r => r.RequestedQuantity).HasColumnType("decimal(10,2)");
            entity.Property(r => r.Message).HasMaxLength(500);
            entity.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(r => r.Status);
            entity.HasOne(r => r.Harvest)
                .WithMany(h => h.PurchaseRequests)
                .HasForeignKey(r => r.HarvestId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(r => r.BuyerProfile)
                .WithMany()
                .HasForeignKey(r => r.BuyerProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Order>(entity =>
        {
            entity.Property(o => o.TotalQuantity).HasColumnType("decimal(10,2)");
            entity.Property(o => o.TotalAmount).HasColumnType("decimal(10,2)");
            entity.Property(o => o.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(o => o.Status);
            entity.HasOne(o => o.Request)
                .WithOne(r => r.Order)
                .HasForeignKey<Order>(o => o.RequestId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(o => o.FarmerProfile)
                .WithMany()
                .HasForeignKey(o => o.FarmerProfileId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(o => o.BuyerProfile)
                .WithMany()
                .HasForeignKey(o => o.BuyerProfileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Notification>(entity =>
        {
            entity.Property(n => n.Title).HasMaxLength(150).IsRequired();
            entity.Property(n => n.Message).IsRequired();
            entity.HasIndex(n => n.UserId);
            entity.HasOne(n => n.User)
                .WithMany()
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(a => a.AuditId);
            entity.Property(a => a.Action).HasMaxLength(100).IsRequired();
            entity.Property(a => a.EntityName).HasMaxLength(100).IsRequired();
            entity.HasIndex(a => a.UserId);
            entity.HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
