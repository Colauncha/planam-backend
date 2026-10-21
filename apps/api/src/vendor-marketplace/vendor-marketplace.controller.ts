import { Controller, Get, Param, Query, Body, Post } from '@nestjs/common';
import { VendorMarketplaceService } from './vendor-marketplace.service';
import { SearchVendorsDto } from './dto/search-vendors.dto';
import { IdentityAccessService } from '../identity-access/identity-access.service';
import { SubmitPublicReviewDto } from './dto/submit-public-review.dto';

@Controller('vendors')
export class VendorMarketplaceController {
  constructor(
    private readonly vendorMarketplaceService: VendorMarketplaceService,
    private readonly identityAccessService: IdentityAccessService,
  ) {}

  @Get()
  search(@Query() query: SearchVendorsDto) {
    return this.vendorMarketplaceService.search(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vendorMarketplaceService.findOne(id);
  }

  @Get(':id/portfolio')
  portfolio(@Param('id') id: string) {
    return this.identityAccessService.listPortfolio(id);
  }

  @Get(':id/rating-summary')
  ratingSummary(@Param('id') id: string) {
    return this.vendorMarketplaceService.getRatingSummary(id);
  }

  @Post(':id/reviews/public')
  submitPublicReview(
    @Param('id') id: string,
    @Body() dto: SubmitPublicReviewDto,
  ) {
    return this.vendorMarketplaceService.submitPublicReview(id, dto);
  }
}
