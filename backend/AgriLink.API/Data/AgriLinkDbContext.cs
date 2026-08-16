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
    }
}
