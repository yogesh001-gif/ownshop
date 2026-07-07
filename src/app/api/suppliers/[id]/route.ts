import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone,
        address: body.address,
      }
    });

    return NextResponse.json(supplier);
  } catch (error: any) {
    console.error("Error updating supplier:", error);
    return NextResponse.json({ error: error.message || 'Failed to update supplier' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Check if supplier has purchases
    const purchasesCount = await prisma.purchase.count({
      where: { supplierId: id }
    });

    if (purchasesCount > 0) {
      return NextResponse.json({ 
        error: `Cannot delete supplier. They have ${purchasesCount} associated purchase(s). Please delete all purchases for this supplier first.` 
      }, { status: 400 });
    }

    // Delete associated supplier payments first (if any manual payments were made without purchases)
    await prisma.supplierPayment.deleteMany({
      where: { supplierId: id }
    });

    const supplier = await prisma.supplier.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json({ error: error.message || 'Failed to delete supplier' }, { status: 500 });
  }
}
